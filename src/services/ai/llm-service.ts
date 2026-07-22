/**
 * LLM Service — Provider-agnostic abstraction layer.
 *
 * Usage:
 *   import { llm } from '@/services/ai/llm-service';
 *   const result = await llm.complete(prompt, { systemPrompt: '...' });
 *
 * The concrete provider is chosen based on LLM_PROVIDER env var and available API keys.
 * If no key is configured, falls back gracefully to the intelligent MockProvider.
 */

import type { LLMProvider, LLMCompletionOptions, LLMCompletionResult, LLMStreamChunk } from '@/types';
import { llmLogger } from '@/utils/logger';
import { classifyError } from '@/utils/error-handler';

/** Dynamically resolved provider per call so environment changes take effect immediately. */
async function getProvider(): Promise<LLMProvider> {
  const providerName = (process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase();

  if (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import('./providers/anthropic-provider');
    return new AnthropicProvider();
  }

  if (providerName === 'openai' && process.env.OPENAI_API_KEY) {
    const { OpenAIProvider } = await import('./providers/openai-provider');
    return new OpenAIProvider();
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import('./providers/anthropic-provider');
    return new AnthropicProvider();
  }

  if (process.env.OPENAI_API_KEY) {
    const { OpenAIProvider } = await import('./providers/openai-provider');
    return new OpenAIProvider();
  }

  // Fallback to Intelligent Mock Provider if no API key is present
  llmLogger.info('No API key found in env vars — using Intelligent Mock Provider');
  const { MockProvider } = await import('./providers/mock-provider');
  return new MockProvider();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a one-shot completion request and return the full response.
 */
export async function complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
  const start = Date.now();
  try {
    const provider = await getProvider();
    const result = await provider.complete(prompt, options);
    llmLogger.info('Completion finished', {
      model: result.model,
      tokens: result.tokensUsed,
      latencyMs: Date.now() - start,
    });
    return result;
  } catch (err) {
    llmLogger.error('Completion failed', { error: String(err), latencyMs: Date.now() - start });
    throw classifyError(err);
  }
}

/**
 * Stream a completion response chunk-by-chunk.
 */
export async function* streamComplete(
  prompt: string,
  options?: LLMCompletionOptions,
): AsyncIterable<LLMStreamChunk> {
  const start = Date.now();
  try {
    const provider = await getProvider();
    yield* provider.streamComplete(prompt, options);
    llmLogger.info('Stream finished', { latencyMs: Date.now() - start });
  } catch (err) {
    llmLogger.error('Stream failed', { error: String(err), latencyMs: Date.now() - start });
    throw classifyError(err);
  }
}

/** Convenience wrapper — the object callers import. */
export const llm = { complete, streamComplete } as const;
