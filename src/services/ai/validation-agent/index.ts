/**
 * Validation Agent — post-extraction validation and follow-up generation.
 *
 * Runs after every requirement merge to:
 * 1. Check for missing required fields
 * 2. Flag low-confidence values
 * 3. Generate intelligent follow-up questions
 */

import type { RequirementModel, ValidationIssue, RequirementFieldKey } from '@/types';
import { REQUIRED_FIELDS, FIELD_META_MAP } from '@/constants/requirement-fields';
import { llm } from '@/services/ai/llm-service';
import { getMissingBudgetDependencies } from '@/services/ai/parser/merge-engine';
import { buildBudgetDependencyQuestion } from '@/services/ai/prompt-engine/follow-up';
import { buildValidationSystemPrompt, buildValidationUserPrompt } from '@/services/ai/prompt-engine/validation';
import { parseValidationResponse } from '@/services/ai/parser/requirement-parser';
import { validationLogger } from '@/utils/logger';

const LOW_CONFIDENCE_THRESHOLD = 70;

/**
 * Validates the current requirement model and returns a list of issues.
 * Uses a combination of rule-based checks and AI-powered validation.
 */
export async function validateRequirements(
  requirement: RequirementModel,
): Promise<ValidationIssue[]> {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  // ── Rule-based checks ────────────────────────────────────────────────
  for (const meta of REQUIRED_FIELDS) {
    const field = requirement[meta.key] as { value: unknown; confidence: number };
    if (!field) continue;

    if (field.value === null || field.value === undefined) {
      issues.push({
        field: meta.key,
        severity: 'missing',
        message: `${meta.label} has not been provided yet.`,
        suggestedQuestion: generateDefaultQuestion(meta.key),
      });
    } else if (field.confidence < LOW_CONFIDENCE_THRESHOLD) {
      issues.push({
        field: meta.key,
        severity: 'low-confidence',
        message: `${meta.label} was extracted with low confidence (${field.confidence}%).`,
        suggestedQuestion: `Could you confirm the ${meta.label.toLowerCase()}? I want to make sure I captured it correctly.`,
      });
    }
  }

  // ── Budget dependency check ──────────────────────────────────────────
  // Budget is only complete with an amount AND currency AND period. If the
  // amount is present but a dependency is missing, ask for it up front.
  const missingBudgetDeps = getMissingBudgetDependencies(requirement);
  if (missingBudgetDeps.length > 0) {
    issues.unshift({
      field: missingBudgetDeps[0],
      severity: 'missing',
      message: 'Budget is incomplete — a currency and budget period are required before the budget can be finalised.',
      suggestedQuestion: buildBudgetDependencyQuestion(missingBudgetDeps),
    });
  }

  // ── AI-powered validation (if we have enough data) ───────────────────
  const filledCount = REQUIRED_FIELDS.length - issues.filter((i) => i.severity === 'missing').length;
  if (filledCount >= 3) {
    try {
      const snapshotJson = JSON.stringify(
        requirementToSimpleObj(requirement),
        null,
        2,
      );
      const result = await llm.complete(
        buildValidationUserPrompt(snapshotJson),
        {
          systemPrompt: buildValidationSystemPrompt(),
          maxTokens: 1024,
          temperature: 0.2,
        },
      );

      const parsed = parseValidationResponse(result.content);
      if (parsed?.issues) {
        for (const aiIssue of parsed.issues) {
          // Avoid duplicating rule-based issues
          const alreadyExists = issues.some(
            (i) => i.field === aiIssue.field && i.severity === aiIssue.severity,
          );
          if (!alreadyExists && isValidFieldKey(aiIssue.field)) {
            issues.push({
              field: aiIssue.field as RequirementFieldKey,
              severity: aiIssue.severity as ValidationIssue['severity'],
              message: aiIssue.message,
              suggestedQuestion: aiIssue.suggestedQuestion,
            });
          }
        }
      }
    } catch (err) {
      validationLogger.warn('AI validation failed, using rule-based only', { error: String(err) });
    }
  }

  validationLogger.info('Validation complete', {
    issueCount: issues.length,
    latencyMs: Date.now() - start,
  });

  return issues.slice(0, 10); // cap at 10
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requirementToSimpleObj(req: RequirementModel): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const meta of REQUIRED_FIELDS) {
    const field = req[meta.key] as { value: unknown };
    obj[meta.key] = field?.value ?? null;
  }
  return obj;
}

function isValidFieldKey(key: string): boolean {
  return key in FIELD_META_MAP;
}

function generateDefaultQuestion(key: RequirementFieldKey): string {
  const meta = FIELD_META_MAP[key];
  const questions: Record<string, string> = {
    company: 'What is your company name?',
    industry: 'Which industry does your company operate in?',
    users: 'How many users will need access to the system?',
    region: 'Which region or geography should the solution be deployed in?',
    solutionType: 'What type of solution are you looking for?',
    budget: 'Do you have a budget range in mind for this solution?',
    cloudProvider: 'Do you have a preferred cloud provider (AWS, Azure, GCP)?',
    database: 'What type of database does your application require?',
    storage: 'What are your storage requirements?',
    compliance: 'Are there any compliance or regulatory requirements (e.g., HIPAA, SOC2, GDPR)?',
    security: 'What security requirements does your organisation have?',
    availability: 'What uptime or availability SLA do you need (e.g., 99.9%, 99.99%)?',
  };
  return questions[key] ?? `Could you tell me about your ${meta?.label?.toLowerCase() ?? key} requirements?`;
}
