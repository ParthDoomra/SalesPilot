/**
 * Firebase Messages Service
 *
 * CRUD for the `messages` collection.
 * Uses in-memory storage. When Firebase is installed, swap in Firestore calls.
 */

import type { Message } from '@/types';
import { firebaseLogger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store: Map<string, Message> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createMessage(message: Message): Promise<Message> {
  store.set(message.id, message);
  return message;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return Array.from(store.values())
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateMessage(id: string, patch: Partial<Message>): Promise<void> {
  const existing = store.get(id);
  if (existing) store.set(id, { ...existing, ...patch });
}
