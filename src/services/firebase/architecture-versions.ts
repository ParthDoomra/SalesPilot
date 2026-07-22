/**
 * Firebase Architecture Versions Service
 *
 * Stores immutable snapshots of architecture iterations (V1, V2, V3).
 */

import type { ArchitectureModel, ArchitectureVersion } from '@/types';
import { firebaseLogger } from '@/utils/logger';

const store: ArchitectureVersion[] = [];

export async function createArchitectureVersion(
  arch: ArchitectureModel,
  changedSummary: string,
): Promise<ArchitectureVersion> {
  const version: ArchitectureVersion = {
    id: `arch_v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    architectureId: arch.id,
    version: arch.version,
    snapshot: JSON.parse(JSON.stringify(arch)),
    changedSummary,
    createdAt: new Date().toISOString(),
  };

  store.push(version);
  firebaseLogger.info('Architecture version created', { id: version.id, version: version.version });
  return version;
}

export async function listArchitectureVersions(architectureId: string): Promise<ArchitectureVersion[]> {
  return store
    .filter((v) => v.architectureId === architectureId)
    .sort((a, b) => a.version - b.version);
}
