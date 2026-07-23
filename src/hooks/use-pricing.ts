/**
 * usePricing — generates the catalog-based pricing report ON DEMAND.
 *
 * Pricing is NOT computed automatically. The user triggers `generate()` (the
 * "Generate Pricing" action), which reads the Phase 2 requirement + Phase 3
 * architecture on the server, combines them, and returns the report.
 */

"use client";

import * as React from 'react';
import { useProjectArchitectureStore } from '@/lib/project-architecture-store';
import { useProjectPricingStore } from '@/lib/project-pricing-store';
import { useRequirementStore } from '@/features/workspace/stores/requirement-store';
import { syncProjectFromPricingEstimate } from '@/lib/project-currency';
import type { PricingEstimate, OptionCostEstimate } from '@/types';

interface UsePricingResult {
  estimate: PricingEstimate | null;
  isLoading: boolean;
  error: string | null;
  /** True once a generation attempt has completed (success or not). */
  hasGenerated: boolean;
  /** Set when generation could not run (e.g. 'no-architecture'). */
  reason: string | null;
  /** True when a selected architecture exists in the persisted project state. */
  hasArchitecture: boolean;
  activeOptionId: string | null;
  activeOption: OptionCostEstimate | null;
  setActiveOptionId: (id: string) => void;
  generate: () => Promise<void>;
}

export function usePricing(projectId: string): UsePricingResult {
  const [estimate, setEstimate] = React.useState<PricingEstimate | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [activeOptionId, setActiveOptionIdState] = React.useState<string | null>(null);

  // The selected architecture comes from the durable, persisted project state —
  // the same state the Architecture page writes to. No manual selection needed.
  const architecture = useProjectArchitectureStore((s) => s.byProject[projectId] ?? null);
  const persistSelectedOption = useProjectArchitectureStore((s) => s.setSelectedOptionId);
  const savedEstimate = useProjectPricingStore((s) => s.byProject[projectId] ?? null);
  const persistPricing = useProjectPricingStore((s) => s.setPricing);

  // Rehydrate the last generated report from durable storage so currency and
  // amounts survive reloads without forcing a regeneration.
  React.useEffect(() => {
    if (!savedEstimate || estimate) return;
    setEstimate(savedEstimate);
    setActiveOptionIdState(savedEstimate.selectedOptionId);
    setHasGenerated(true);
    syncProjectFromPricingEstimate(projectId, savedEstimate);
  }, [projectId, savedEstimate, estimate]);

  const generate = React.useCallback(async () => {
    if (!projectId) return;

    if (!architecture) {
      // Nothing selected in Phase 3 yet — surface the "generate an architecture
      // first" empty state instead of erroring.
      setEstimate(null);
      setReason('no-architecture');
      setHasGenerated(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setReason(null);
    try {
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
          // Non-fatal — server may still have the requirement in its store.
        }
      }

      // Combine the selected Architecture JSON (from client state) with the
      // Phase 2 Requirement JSON (read on the server) to build the report.
      const res = await fetch('/api/pricing/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture, requirement: scopedRequirement }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate the pricing report.');
      }
      const data = await res.json();
      const next: PricingEstimate | null = data.estimate ?? null;
      setEstimate(next);
      if (next) {
        persistPricing(projectId, next);
        syncProjectFromPricingEstimate(projectId, next);
      } else {
        persistPricing(projectId, null);
      }
      setReason(next ? null : data.reason ?? null);
      setActiveOptionIdState(next ? next.selectedOptionId : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the pricing report.');
      setEstimate(null);
    } finally {
      setHasGenerated(true);
      setIsLoading(false);
    }
  }, [projectId, architecture, persistPricing]);

  const activeOption =
    (estimate?.options.find((o) => o.optionId === activeOptionId) ?? estimate?.options[0]) || null;

  // Switching alternatives (Balanced / Performance / Budget) also updates the
  // project's selected architecture so the whole app stays consistent.
  const setActiveOptionId = React.useCallback(
    (id: string) => {
      setActiveOptionIdState(id);
      persistSelectedOption(projectId, id);
    },
    [projectId, persistSelectedOption],
  );

  // Keep the project header's "Monthly estimate" in sync with the active option,
  // in the report's currency. Runs whenever the active figure changes.
  const activeMonthly = activeOption?.monthlyCost ?? null;
  React.useEffect(() => {
    if (!estimate || activeMonthly === null) return;
    syncProjectFromPricingEstimate(projectId, {
      ...estimate,
      selectedOptionId: activeOptionId ?? estimate.selectedOptionId,
    });
  }, [projectId, estimate, activeOptionId, activeMonthly]);

  return {
    estimate,
    isLoading,
    error,
    hasGenerated,
    reason,
    hasArchitecture: !!architecture,
    activeOptionId,
    activeOption,
    setActiveOptionId,
    generate,
  };
}
