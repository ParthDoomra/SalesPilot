/**
 * Firebase Conversations Service
 *
 * CRUD for the `conversations` collection.
 * Uses in-memory storage. When Firebase is installed, swap in Firestore calls.
 */

import type { Conversation } from '@/types';
import { firebaseLogger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// In-memory store (works without Firebase)
// ---------------------------------------------------------------------------

const store: Map<string, Conversation> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createConversation(conversation: Conversation): Promise<Conversation> {
  store.set(conversation.id, conversation);
  firebaseLogger.info('Conversation created', { id: conversation.id });
  return conversation;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return store.get(id) ?? null;
}

export async function listConversations(projectId: string): Promise<Conversation[]> {
  return Array.from(store.values())
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateConversation(id: string, patch: Partial<Conversation>): Promise<void> {
  const existing = store.get(id);
  if (existing) store.set(id, { ...existing, ...patch });
}
