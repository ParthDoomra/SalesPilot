"use client";

/**
 * Project Architecture Store — the durable, client-side source of truth for a
 * project's *selected* cloud architecture (Phase 3 → Phase 4 handoff).
 *
 * The server-side architecture/requirement services keep their data in-memory
 * only, so a dev reload (or a route handler running in a fresh module context)
 * loses it — which is why the Pricing page could not "detect" a generated and
 * selected architecture. This store persists the full selected ArchitectureModel
 * per project to localStorage so:
 *   • every Architecture-page component reads from ONE shared state, and
 *   • the Pricing module can always read the selected architecture directly,
 *     without any manual re-selection.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ArchitectureModel } from "@/types";

interface ProjectArchitectureState {
  /** projectId → the selected ArchitectureModel for that project. */
  byProject: Record<string, ArchitectureModel>;

  /** Persist (or clear) the selected architecture for a project. */
  setArchitecture: (projectId: string, architecture: ArchitectureModel | null) => void;

  /** Persist just the selected option id, keeping the rest of the model intact. */
  setSelectedOptionId: (projectId: string, optionId: string) => void;

  /** Read the selected architecture for a project (null if none saved yet). */
  getArchitecture: (projectId: string) => ArchitectureModel | null;
}

export const useProjectArchitectureStore = create<ProjectArchitectureState>()(
  persist(
    (set, get) => ({
      byProject: {},

      setArchitecture: (projectId, architecture) =>
        set((state) => {
          const next = { ...state.byProject };
          if (architecture) next[projectId] = architecture;
          else delete next[projectId];
          return { byProject: next };
        }),

      setSelectedOptionId: (projectId, optionId) =>
        set((state) => {
          const existing = state.byProject[projectId];
          if (!existing) return state;
          return {
            byProject: {
              ...state.byProject,
              [projectId]: { ...existing, selectedOptionId: optionId },
            },
          };
        }),

      getArchitecture: (projectId) => get().byProject[projectId] ?? null,
    }),
    { name: "salespilot_project_architectures" }
  )
);
