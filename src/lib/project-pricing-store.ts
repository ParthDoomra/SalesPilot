"use client";

/**
 * Project Pricing Store — durable, client-side source of truth for a project's
 * generated pricing report (Phase 4 → Phase 5 handoff).
 *
 * Mirrors `project-architecture-store`: the server keeps pricing in-memory only,
 * so this persists the reviewed PricingEstimate per project to localStorage. The
 * Proposal module reads the saved report directly (passed to the proposal API),
 * so the proposal reflects exactly the pricing the user reviewed.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PricingEstimate } from "@/types";

interface ProjectPricingState {
  /** projectId → the most recently generated PricingEstimate for that project. */
  byProject: Record<string, PricingEstimate>;
  /** Persist (or clear) the pricing report for a project. */
  setPricing: (projectId: string, estimate: PricingEstimate | null) => void;
  /** Read the saved pricing report for a project (null if none saved yet). */
  getPricing: (projectId: string) => PricingEstimate | null;
}

export const useProjectPricingStore = create<ProjectPricingState>()(
  persist(
    (set, get) => ({
      byProject: {},

      setPricing: (projectId, estimate) =>
        set((state) => {
          const next = { ...state.byProject };
          if (estimate) next[projectId] = estimate;
          else delete next[projectId];
          return { byProject: next };
        }),

      getPricing: (projectId) => get().byProject[projectId] ?? null,
    }),
    { name: "salespilot_project_pricing" }
  )
);
