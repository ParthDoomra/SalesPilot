/**
 * useProposal — builds the Phase 5 proposal from the persisted selected
 * architecture + the requirement + the pricing report.
 *
 * Mirrors usePricing: the architecture comes from the durable, persisted project
 * state (no manual selection), and the report is generated on the server by
 * combining all three phase outputs.
 */

"use client";

import * as React from 'react';
import { useProjectArchitectureStore } from '@/lib/project-architecture-store';
import { useProjectsStore } from '@/lib/projects-store';
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
  const [proposal, setProposal] = React.useState<ProposalModel | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);

  const architecture = useProjectArchitectureStore((s) => s.byProject[projectId] ?? null);
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId) ?? null);
  const customerName = project?.customer;

  const generate = React.useCallback(async () => {
    if (!projectId) return;

    if (!architecture) {
      setProposal(null);
      setReason('no-architecture');
      setHasGenerated(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setReason(null);
    try {
      const res = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture, customerName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate the proposal.');
      }
      const data = await res.json();
      const next: ProposalModel | null = data.proposal ?? null;
      setProposal(next);
      setReason(next ? null : data.reason ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the proposal.');
      setProposal(null);
    } finally {
      setHasGenerated(true);
      setIsLoading(false);
    }
  }, [projectId, architecture, customerName]);

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
