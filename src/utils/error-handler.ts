/**
 * Centralised error handling for the AI pipeline.
 *
 * Maps low-level provider errors into user-friendly messages that
 * the chat UI can display without leaking implementation details.
 */

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly userMessage: string,
    public readonly retryable: boolean = false,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export type AIErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'EMPTY_RESPONSE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'AUTH_FAILED'
  | 'BAD_REQUEST'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

// ---------------------------------------------------------------------------
// Error factory
// ---------------------------------------------------------------------------

const USER_MESSAGES: Record<AIErrorCode, string> = {
  PROVIDER_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again in a moment.',
  INVALID_RESPONSE:     'The AI returned an unexpected response. Please retry your message.',
  EMPTY_RESPONSE:       'The AI did not generate a response. Please try rephrasing your message.',
  TIMEOUT:              'The request timed out. Please try again.',
  RATE_LIMITED:         'Too many requests — please wait a few seconds and try again.',
  AUTH_FAILED:          'AI service authentication failed. Please check your API key in .env.local.',
  BAD_REQUEST:          'The AI request parameters were invalid. Please check your prompt or model configuration.',
  PARSE_ERROR:         'Could not parse the AI response. Please retry.',
  UNKNOWN:             'An error occurred communicating with the AI service. Please try again.',
};

/**
 * Wraps a raw error from an LLM provider into a typed AIServiceError.
 * Inspects status codes and common error patterns to classify the failure.
 */
export function classifyError(err: unknown): AIServiceError {
  if (err instanceof AIServiceError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;

  if (status === 401 || status === 403 || message.toLowerCase().includes('api_key') || message.toLowerCase().includes('authentication')) {
    return new AIServiceError(message, 'AUTH_FAILED', USER_MESSAGES.AUTH_FAILED, false, err);
  }
  if (status === 400) {
    return new AIServiceError(message, 'BAD_REQUEST', `API error (400): ${message.slice(0, 150)}`, false, err);
  }
  if (status === 429) {
    return new AIServiceError(message, 'RATE_LIMITED', USER_MESSAGES.RATE_LIMITED, true, err);
  }
  if (status === 500 || status === 502 || status === 503) {
    return new AIServiceError(message, 'PROVIDER_UNAVAILABLE', USER_MESSAGES.PROVIDER_UNAVAILABLE, true, err);
  }
  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out')) {
    return new AIServiceError(message, 'TIMEOUT', USER_MESSAGES.TIMEOUT, true, err);
  }
  if (message.toLowerCase().includes('rate') && message.toLowerCase().includes('limit')) {
    return new AIServiceError(message, 'RATE_LIMITED', USER_MESSAGES.RATE_LIMITED, true, err);
  }

  return new AIServiceError(message, 'UNKNOWN', message ? `AI Error: ${message.slice(0, 150)}` : USER_MESSAGES.UNKNOWN, true, err);
}

/** A user-friendly string for display in the chat when something goes wrong. */
export function getFriendlyMessage(code: AIErrorCode): string {
  return USER_MESSAGES[code];
}
