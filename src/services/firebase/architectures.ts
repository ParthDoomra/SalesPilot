/**
 * Firebase Architectures Service
 *
 * CRUD operations for the `architectures` collection.
 * Uses in-memory storage. When Firebase is installed, swap in Firestore calls.
 */

import type { ArchitectureModel } from '@/types';
import { firebaseLogger } from '@/utils/logger';

const store: Map<string, ArchitectureModel> = new Map();

export async function saveArchitecture(arch: ArchitectureModel): Promise<ArchitectureModel> {
  store.set(arch.id, arch);
  firebaseLogger.info('Architecture saved', { id: arch.id, version: arch.version });
  return arch;
}

export async function getArchitectureByProject(projectId: string): Promise<ArchitectureModel | null> {
  // Return the most-recently-updated architecture for the project. Guards against
  // any stale duplicates that may exist for the same project in the in-memory store.
  const matches = Array.from(store.values()).filter((a) => a.projectId === projectId);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

/**
 * Removes every stored architecture for a project except the one with `keepId`.
 * Keeps the store to a single architecture per project so reads never return a
 * stale snapshot after a regeneration or provider switch.
 */
export async function pruneProjectArchitectures(projectId: string, keepId: string): Promise<void> {
  for (const [id, arch] of store) {
    if (arch.projectId === projectId && id !== keepId) {
      store.delete(id);
    }
  }
}

export async function updateArchitecture(
  id: string,
  patch: Partial<ArchitectureModel>,
): Promise<ArchitectureModel | null> {
  const existing = store.get(id);
  if (!existing) return null;
  const updated: ArchitectureModel = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}
