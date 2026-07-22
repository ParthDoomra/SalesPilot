/**
 * Anthropic (Claude) provider implementation.
 *
 * Implements the LLMProvider interface so it can be hot-swapped with
 * OpenAI or any future provider.
 */

import type { LLMProvider, LLMCompletionOptions, LLMCompletionResult, LLMStreamChunk } from '@/types';
import { llmLogger } from '@/utils/logger';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022';
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set in .env.local');
    this.apiKey = key;
  }

  async complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: prompt },
    ];

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
    };
    if (options?.systemPrompt) {
      body.system = options.systemPrompt;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      llmLogger.error(`Anthropic API request failed`, { status: res.status, body: text });
      throw Object.assign(new Error(`Anthropic API error (${res.status}): ${text}`), { status: res.status });
    }

    const data = await res.json();
    const content = data.content?.[0]?.text ?? '';
    const tokensUsed =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return { content, tokensUsed, model };
  }

  async *streamComplete(prompt: string, options?: LLMCompletionOptions): AsyncIterable<LLMStreamChunk> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: prompt },
    ];

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
      stream: true,
    };
    if (options?.systemPrompt) {
      body.system = options.systemPrompt;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      llmLogger.error(`Anthropic API stream failed`, { status: res.status, body: text });
      throw Object.assign(new Error(`Anthropic API error (${res.status}): ${text}`), { status: res.status });
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            yield { content: '', done: true };
            return;
          }
          try {
            const event = JSON.parse(payload);
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield { content: event.delta.text, done: false };
            }
            if (event.type === 'message_stop') {
              yield { content: '', done: true };
              return;
            }
          } catch {
            llmLogger.warn('Failed to parse SSE chunk', { payload });
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: '', done: true };
  }
}
