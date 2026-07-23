"use client";

/**
 * Shared proposal generation — assembles a Phase 5 proposal for a project from
 * its persisted selected architecture (Phase 3), requirement (Phase 2) and
 * pricing report (Phase 4), by calling the existing `/api/proposal/generate`
 * endpoint.
 *
 * Extracted so both `useProposal` (the project's Proposal tab) and the Proposal
 * Center "Regenerate" action share one code path and one set of services.
 */

import { useProjectArchitectureStore } from "@/lib/project-architecture-store";
import { useProjectPricingStore } from "@/lib/project-pricing-store";
import { useProjectsStore } from "@/lib/projects-store";
import { useRequirementStore } from "@/features/workspace/stores/requirement-store";
import { syncProjectFromPricingEstimate } from "@/lib/project-currency";
import type { ProposalModel } from "@/types";

export interface GenerateProposalResult {
  proposal: ProposalModel | null;
  /** Set when generation could not run (e.g. 'no-architecture'). */
  reason: string | null;
  /** Set when generation failed unexpectedly. */
  error: string | null;
}

export async function generateProposalForProject(projectId: string): Promise<GenerateProposalResult> {
  if (!projectId) return { proposal: null, reason: null, error: "Missing project." };

  const architecture = useProjectArchitectureStore.getState().byProject[projectId] ?? null;
  if (!architecture) {
    // No selected architecture yet — surface the guided empty state.
    return { proposal: null, reason: "no-architecture", error: null };
  }

  const project = useProjectsStore.getState().projects.find((p) => p.id === projectId) ?? null;
  const customerName = project?.customer;

  // Prefer the in-memory requirement when it belongs to this project; otherwise
  // read it from the server (the API also falls back to its own store).
  let scopedRequirement =
    useRequirementStore.getState().requirement?.projectId === projectId
      ? useRequirementStore.getState().requirement ?? undefined
      : undefined;

  if (!scopedRequirement) {
    try {
      const reqRes = await fetch(`/api/projects/${projectId}/requirements`);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        scopedRequirement = reqData.requirement ?? undefined;
      }
    } catch {
      // Non-fatal — the server may still have the requirement in its store.
    }
  }

  try {
    const res = await fetch("/api/proposal/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ architecture, customerName, requirement: scopedRequirement }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate the proposal.");
    }
    const data = await res.json();
    const proposal: ProposalModel | null = data.proposal ?? null;

    // Keep the project's pricing report + currency in sync with the proposal.
    if (proposal?.estimate) {
      useProjectPricingStore.getState().setPricing(projectId, proposal.estimate);
      syncProjectFromPricingEstimate(projectId, proposal.estimate);
    }

    return { proposal, reason: proposal ? null : data.reason ?? null, error: null };
  } catch (err) {
    return {
      proposal: null,
      reason: null,
      error: err instanceof Error ? err.message : "Failed to generate the proposal.",
    };
  }
}
