/**
 * Firebase Requirement Versions Service
 *
 * Stores immutable snapshots of the requirement model.
 * Uses in-memory storage. When Firebase is installed, swap in Firestore calls.
 */

import type { RequirementModel, RequirementVersion, RequirementFieldKey } from '@/types';
import { firebaseLogger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store: RequirementVersion[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createVersion(
  requirement: RequirementModel,
  changedFields: RequirementFieldKey[],
): Promise<RequirementVersion> {
  const version: RequirementVersion = {
    id: `rv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    requirementId: requirement.id,
    version: requirement.version,
    snapshot: JSON.parse(JSON.stringify(requirement)),
    changedFields,
    createdAt: new Date().toISOString(),
  };

  store.push(version);
  firebaseLogger.info('Version created', {
    id: version.id,
    version: version.version,
    changedFields,
  });
  return version;
}

export async function listVersions(requirementId: string): Promise<RequirementVersion[]> {
  return store
    .filter((v) => v.requirementId === requirementId)
    .sort((a, b) => a.version - b.version);
}

export async function getVersion(versionId: string): Promise<RequirementVersion | null> {
  return store.find((v) => v.id === versionId) ?? null;
}
