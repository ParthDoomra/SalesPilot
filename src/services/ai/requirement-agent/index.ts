/**
 * Requirement Agent — the main AI orchestrator.
 *
 * For every user message this agent:
 * 1. Builds context (recent messages + requirement snapshot + summary)
 * 2. Calls the LLM via the prompt engine
 * 3. Parses the structured extraction
 * 4. Merges it into the existing requirement model
 * 5. Runs the validation agent for follow-ups
 * 6. Returns a complete AgentResponse
 *
 * This module runs server-side only (inside API routes).
 */

import type { AgentResponse, ConversationContext, ValidationIssue } from '@/types';
import type { RequirementModel, RequirementFieldKey } from '@/types';
import { llm } from '@/services/ai/llm-service';
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from '@/services/ai/prompt-engine/requirement-extraction';
import { parseExtractionResponse } from '@/services/ai/parser/requirement-parser';
import { mergeRequirements, getMissingBudgetDependencies } from '@/services/ai/parser/merge-engine';
import { buildBudgetDependencyQuestion } from '@/services/ai/prompt-engine/follow-up';
import { validateRequirements } from '@/services/ai/validation-agent';
import { agentLogger } from '@/utils/logger';
import { AIServiceError } from '@/utils/error-handler';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RequirementAgentInput {
  userMessage: string;
  context: ConversationContext;
  currentRequirement: RequirementModel;
  messageId?: string;
}

export interface RequirementAgentOutput {
  agentResponse: AgentResponse;
  updatedRequirement: RequirementModel;
  changedFields: string[];
}

/**
 * Process a user message through the requirement intelligence pipeline.
 */
export async function processMessage(
  input: RequirementAgentInput,
): Promise<RequirementAgentOutput> {
  const start = Date.now();
  agentLogger.info('Processing message', {
    projectId: input.context.projectId,
    messageLength: input.userMessage.length,
  });

  // 1. Build prompts
  const snapshotJson = requirementToSimpleJson(input.currentRequirement);
  const systemPrompt = buildExtractionSystemPrompt(
    snapshotJson,
    input.context.conversationSummary,
  );
  const userPrompt = buildExtractionUserPrompt(
    input.userMessage,
    input.context.recentMessages.map((m) => ({ role: m.role, content: m.content })),
  );

  // 2. Call LLM
  const llmResult = await llm.complete(userPrompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 2048,
  });

  // 3. Parse
  const parsed = parseExtractionResponse(llmResult.content);
  if (!parsed) {
    throw new AIServiceError(
      'Failed to parse extraction response',
      'PARSE_ERROR',
      'The AI returned an unexpected response format. Please try again.',
    );
  }

  // 4. Merge
  const { merged, changedFields } = mergeRequirements(
    input.currentRequirement,
    parsed.extractedFields,
    input.messageId,
  );

  // 5. Validate
  let validationIssues: ValidationIssue[] = [];
  try {
    validationIssues = await validateRequirements(merged);
  } catch (err) {
    agentLogger.warn('Validation agent failed, skipping', { error: String(err) });
  }

  // Combine follow-up questions. The budget dependency ask (currency + period)
  // is prioritised so an amount is never left ambiguous, and de-duplicated
  // against the validation issue that carries the same question.
  const missingBudgetDeps = getMissingBudgetDependencies(merged);
  const budgetAsk = missingBudgetDeps.length > 0 ? [buildBudgetDependencyQuestion(missingBudgetDeps)] : [];
  const followUpQuestions = Array.from(
    new Set([
      ...budgetAsk,
      ...parsed.followUpQuestions,
      ...validationIssues.filter((v) => v.severity === 'missing').map((v) => v.suggestedQuestion),
    ]),
  ).slice(0, 3); // max 3

  const latencyMs = Date.now() - start;
  agentLogger.info('Message processed', {
    latencyMs,
    tokensUsed: llmResult.tokensUsed,
    changedFields,
    followUpCount: followUpQuestions.length,
  });

  const agentResponse: AgentResponse = {
    message: parsed.message,
    extractedRequirements: parsed.extractedFields,
    followUpQuestions,
    validationIssues,
    confidence: computeOverallConfidence(merged),
    metadata: {
      tokensUsed: llmResult.tokensUsed,
      latencyMs,
      model: llmResult.model,
    },
  };

  return {
    agentResponse,
    updatedRequirement: merged,
    changedFields,
  };
}

// ---------------------------------------------------------------------------
// Document / paste extraction (conversation-free)
// ---------------------------------------------------------------------------

export interface TextExtractionInput {
  /** Raw pasted requirement text (or extracted document text). */
  text: string;
  currentRequirement: RequirementModel;
  /** Optional source id (e.g. paste id / document id) for provenance. */
  sourceId?: string;
}

export interface TextExtractionOutput {
  updatedRequirement: RequirementModel;
  changedFields: RequirementFieldKey[];
  extractedFields: Record<string, { value: unknown; confidence: number }>;
  message: string;
  followUpQuestions: string[];
}

/**
 * Extracts a structured Requirement JSON directly from a block of text
 * (pasted requirements or parsed document content) — no conversation required.
 *
 * This is the primary Phase 2 entry point: it runs the same extract → parse →
 * merge pipeline the chat agent uses, but without any conversational turn-taking
 * so the Requirement JSON can be populated in a single step.
 */
export async function extractRequirementsFromText(
  input: TextExtractionInput,
): Promise<TextExtractionOutput> {
  const start = Date.now();
  agentLogger.info('Extracting requirements from text', { textLength: input.text.length });

  const snapshotJson = requirementToSimpleJson(input.currentRequirement);
  const systemPrompt = buildExtractionSystemPrompt(snapshotJson);
  const userPrompt = buildExtractionUserPrompt(input.text, []);

  const llmResult = await llm.complete(userPrompt, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  const parsed = parseExtractionResponse(llmResult.content);
  if (!parsed) {
    throw new AIServiceError(
      'Failed to parse extraction response',
      'PARSE_ERROR',
      'Could not extract structured requirements from the provided text. Please try rephrasing it.',
    );
  }

  const { merged, changedFields } = mergeRequirements(
    input.currentRequirement,
    parsed.extractedFields,
    input.sourceId,
  );

  // Prioritise the budget dependency ask (currency + period) when the amount was
  // captured without them — this path does not run the validation agent.
  const missingBudgetDeps = getMissingBudgetDependencies(merged);
  const budgetAsk = missingBudgetDeps.length > 0 ? [buildBudgetDependencyQuestion(missingBudgetDeps)] : [];
  const followUpQuestions = Array.from(
    new Set([...budgetAsk, ...parsed.followUpQuestions]),
  ).slice(0, 3);

  agentLogger.info('Text extraction complete', {
    latencyMs: Date.now() - start,
    changedFields,
  });

  return {
    updatedRequirement: merged,
    changedFields,
    extractedFields: parsed.extractedFields,
    message: parsed.message,
    followUpQuestions,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a RequirementModel to a simple key→value JSON for the prompt.
 */
function requirementToSimpleJson(req: RequirementModel): string {
  const simple: Record<string, unknown> = {};
  const fieldKeys = [
    'company', 'industry', 'employees', 'users', 'region', 'solutionType',
    'budget', 'budgetCurrency', 'budgetPeriod', 'cloudProvider', 'database',
    'backup', 'disasterRecovery', 'storage', 'compliance', 'security',
    'networking', 'availability',
  ] as const;

  for (const key of fieldKeys) {
    const field = req[key];
    if (field && typeof field === 'object' && 'value' in field) {
      simple[key] = (field as { value: unknown }).value;
    }
  }
  return JSON.stringify(simple, null, 2);
}

function computeOverallConfidence(req: RequirementModel): number {
  const fieldKeys = [
    'company', 'industry', 'employees', 'users', 'region', 'solutionType',
    'budget', 'budgetCurrency', 'budgetPeriod', 'cloudProvider', 'database',
    'backup', 'disasterRecovery', 'storage', 'compliance', 'security',
    'networking', 'availability',
  ] as const;

  let totalConfidence = 0;
  let fieldCount = 0;

  for (const key of fieldKeys) {
    const field = req[key];
    if (field && typeof field === 'object' && 'value' in field) {
      const f = field as { value: unknown; confidence: number };
      if (f.value !== null) {
        totalConfidence += f.confidence;
        fieldCount++;
      }
    }
  }

  return fieldCount > 0 ? Math.round(totalConfidence / fieldCount) : 0;
}
