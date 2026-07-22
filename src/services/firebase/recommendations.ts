/**
 * Firebase Cloud Recommendations Service
 *
 * Stores cloud recommendation fit evaluations.
 */

import type { CloudRecommendation } from '@/types';

interface StoredRecommendation {
  id: string;
  projectId: string;
  recommendations: CloudRecommendation[];
  createdAt: string;
}

const store: StoredRecommendation[] = [];

export async function saveRecommendations(
  projectId: string,
  recommendations: CloudRecommendation[],
): Promise<StoredRecommendation> {
  const item: StoredRecommendation = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    recommendations,
    createdAt: new Date().toISOString(),
  };
  store.push(item);
  return item;
}

export async function getLatestRecommendations(projectId: string): Promise<CloudRecommendation[] | null> {
  const items = store.filter((r) => r.projectId === projectId);
  if (items.length === 0) return null;
  return items[items.length - 1].recommendations;
}
