/**
 * Requirement Intelligence Engine — Conversation Types
 *
 * Models the Project → Conversation → Message hierarchy that maps to
 * Firestore collections and drives the chat UI.
 */

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status: 'active' | 'archived';
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  /** Total tokens consumed by this exchange (prompt + completion). */
  tokensUsed?: number;
  /** End-to-end latency in milliseconds. */
  latencyMs?: number;
  /** Which requirement fields were extracted from this message. */
  extractedFields?: string[];
  /** The model identifier used (e.g. "claude-sonnet-4-20250514"). */
  model?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  /** Optional metadata attached by the AI pipeline. */
  metadata?: MessageMetadata;
  /** If true the message was edited after initial send. */
  edited?: boolean;
  /** Original content before the most recent edit. */
  originalContent?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createMessage(
  partial: Pick<Message, 'conversationId' | 'role' | 'content'> & { id: string },
): Message {
  return {
    ...partial,
    createdAt: new Date().toISOString(),
  };
}
