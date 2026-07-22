/**
 * Firebase Decision Logs Service
 *
 * Stores decision engine execution logs.
 */

import type { DecisionLog } from '@/types';

interface StoredDecisionLogBatch {
  id: string;
  projectId: string;
  logs: DecisionLog[];
  createdAt: string;
}

const store: StoredDecisionLogBatch[] = [];

export async function saveDecisionLogs(projectId: string, logs: DecisionLog[]): Promise<StoredDecisionLogBatch> {
  const batch: StoredDecisionLogBatch = {
    id: `declog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    logs,
    createdAt: new Date().toISOString(),
  };
  store.push(batch);
  return batch;
}

export async function getLatestDecisionLogs(projectId: string): Promise<DecisionLog[]> {
  const items = store.filter((d) => d.projectId === projectId);
  if (items.length === 0) return [];
  return items[items.length - 1].logs;
}
