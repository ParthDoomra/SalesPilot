/**
 * Prompt: Conversation Summarisation
 *
 * When the conversation grows beyond the context window, this prompt
 * compresses older messages into a concise summary that preserves
 * all requirement-relevant information.
 */

export function buildSummarizationSystemPrompt(): string {
  return `You are a summarisation engine. Given a series of conversation messages between a presales agent and a customer, produce a concise summary that preserves:

1. All business requirements mentioned.
2. Technical preferences and constraints.
3. Budget and timeline information.
4. Any corrections or changes the customer made.

## Rules
- Be factual — do not embellish.
- Keep the summary under 300 words.
- Structure it as bullet points grouped by topic.

## Response Format
Return plain text (not JSON).`;
}

export function buildSummarizationUserPrompt(
  messages: Array<{ role: string; content: string }>,
): string {
  const formatted = messages
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n\n');
  return `## Conversation to Summarise\n${formatted}`;
}
