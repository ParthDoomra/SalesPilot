/**
 * OpenAI provider implementation.
 *
 * Drop-in replacement for the Anthropic provider — swap by setting
 * LLM_PROVIDER=openai in .env.local.
 */

import type { LLMProvider, LLMCompletionOptions, LLMCompletionResult, LLMStreamChunk } from '@/types';
import { llmLogger } from '@/utils/logger';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    this.apiKey = key;
  }

  async complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: options?.temperature ?? 0.3,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw Object.assign(new Error(`OpenAI API error: ${res.status} ${text}`), { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const tokensUsed = (data.usage?.total_tokens ?? 0);

    return { content, tokensUsed, model };
  }

  async *streamComplete(prompt: string, options?: LLMCompletionOptions): AsyncIterable<LLMStreamChunk> {
    const model = options?.model ?? DEFAULT_MODEL;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: options?.temperature ?? 0.3,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw Object.assign(new Error(`OpenAI API error: ${res.status} ${text}`), { status: res.status });
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
            const delta = event.choices?.[0]?.delta?.content;
            if (delta) {
              yield { content: delta, done: false };
            }
            if (event.choices?.[0]?.finish_reason) {
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
