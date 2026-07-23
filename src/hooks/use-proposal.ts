/**
 * useProposal — builds the Phase 5 proposal from the persisted selected
 * architecture + the requirement + the pricing report.
 *
 * Mirrors usePricing: the architecture comes from the durable, persisted project
 * state (no manual selection), and the report is generated on the server by
 * combining all three phase outputs. Every successful generation is persisted as
 * a new version in the project proposal store, which powers the Proposal Center
 * and its version history.
 */

"use client";

import * as React from 'react';
import { useProjectArchitectureStore } from '@/lib/project-architecture-store';
import { useProjectProposalStore } from '@/lib/project-proposal-store';
import { generateProposalForProject } from '@/lib/proposal-generation';
import type { ProposalModel } from '@/types';

interface UseProposalResult {
  proposal: ProposalModel | null;
  isLoading: boolean;
  error: string | null;
  hasGenerated: boolean;
  reason: string | null;
  hasArchitecture: boolean;
  generate: () => Promise<void>;
}

export function useProposal(projectId: string): UseProposalResult {
  // Rehydrate the latest saved proposal so revisiting the tab neither loses the
  // proposal nor auto-generates a spurious new version.
  const [proposal, setProposal] = React.useState<ProposalModel | null>(
    () => useProjectProposalStore.getState().getLatest(projectId)?.proposal ?? null,
  );
  const [hasGenerated, setHasGenerated] = React.useState<boolean>(
    () => !!useProjectProposalStore.getState().getLatest(projectId),
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState<string | null>(null);

  const architecture = useProjectArchitectureStore((s) => s.byProject[projectId] ?? null);
  const addVersion = useProjectProposalStore((s) => s.addVersion);

  const generate = React.useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    setReason(null);
    try {
      const result = await generateProposalForProject(projectId);
      setProposal(result.proposal);
      setReason(result.reason);
      if (result.error) setError(result.error);
      // Persist each successful generation as the next version.
      if (result.proposal) addVersion(projectId, result.proposal);
    } finally {
      setHasGenerated(true);
      setIsLoading(false);
    }
  }, [projectId, addVersion]);

  return {
    proposal,
    isLoading,
    error,
    hasGenerated,
    reason,
    hasArchitecture: !!architecture,
    generate,
  };
}
