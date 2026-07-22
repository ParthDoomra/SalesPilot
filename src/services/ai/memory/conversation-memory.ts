/**
 * Conversation Memory Manager
 *
 * Manages the context window for LLM calls:
 * - Keeps recent messages within token limits
 * - Generates rolling summaries of older messages
 * - Provides context for the requirement agent
 */

import type { Message } from '@/types';
import { llm } from '@/services/ai/llm-service';
import { buildSummarizationSystemPrompt, buildSummarizationUserPrompt } from '@/services/ai/prompt-engine/summarization';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Memory');

/** Maximum number of messages to keep in the context window. */
const MAX_CONTEXT_MESSAGES = 20;

/** When messages exceed this threshold, generate a summary of older ones. */
const SUMMARIZE_THRESHOLD = 15;

/**
 * Trims the message list and optionally generates a summary
 * of the oldest messages to stay within the context window.
 */
export async function manageConversationMemory(
  allMessages: Message[],
  existingSummary?: string,
): Promise<{ recentMessages: Message[]; summary: string | undefined }> {
  if (allMessages.length <= MAX_CONTEXT_MESSAGES) {
    return { recentMessages: allMessages, summary: existingSummary };
  }

  // Split into old (to summarise) and recent (to keep)
  const splitIndex = allMessages.length - SUMMARIZE_THRESHOLD;
  const oldMessages = allMessages.slice(0, splitIndex);
  const recentMessages = allMessages.slice(splitIndex);

  // Only regenerate the summary if we have new old messages
  if (!existingSummary || oldMessages.length > 0) {
    try {
      const summary = await generateSummary(oldMessages, existingSummary);
      return { recentMessages, summary };
    } catch (err) {
      logger.warn('Summary generation failed, using existing summary', { error: String(err) });
      return { recentMessages, summary: existingSummary };
    }
  }

  return { recentMessages, summary: existingSummary };
}

/**
 * Generates a concise summary of conversation messages.
 */
async function generateSummary(
  messages: Message[],
  existingSummary?: string,
): Promise<string> {
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const prompt = buildSummarizationUserPrompt(
    existingSummary
      ? [{ role: 'system', content: `Previous summary: ${existingSummary}` }, ...formattedMessages]
      : formattedMessages,
  );

  const result = await llm.complete(prompt, {
    systemPrompt: buildSummarizationSystemPrompt(),
    maxTokens: 500,
    temperature: 0.2,
  });

  logger.info('Summary generated', { tokens: result.tokensUsed, length: result.content.length });
  return result.content;
}

/**
 * Builds the context object for an LLM call.
 */
export function buildContext(
  projectId: string,
  conversationId: string,
  requirementSnapshot: Record<string, unknown>,
  recentMessages: Message[],
  conversationSummary?: string,
) {
  return {
    projectId,
    conversationId,
    requirementSnapshot,
    recentMessages,
    conversationSummary,
  };
}
