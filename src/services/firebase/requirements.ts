/**
 * Firebase Requirements Service
 *
 * CRUD for the `requirements` collection.
 * Uses in-memory storage. When Firebase is installed, swap in Firestore calls.
 */

import type { RequirementModel } from '@/types';
import { firebaseLogger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store: Map<string, RequirementModel> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function saveRequirement(requirement: RequirementModel): Promise<RequirementModel> {
  store.set(requirement.id, requirement);
  firebaseLogger.info('Requirement saved', { id: requirement.id, version: requirement.version });
  return requirement;
}

export async function getRequirement(projectId: string): Promise<RequirementModel | null> {
  return (
    Array.from(store.values()).find((r) => r.projectId === projectId) ?? null
  );
}

export async function updateRequirement(
  id: string,
  patch: Partial<RequirementModel>,
): Promise<void> {
  const existing = store.get(id);
  if (existing) store.set(id, { ...existing, ...patch } as RequirementModel);
}
