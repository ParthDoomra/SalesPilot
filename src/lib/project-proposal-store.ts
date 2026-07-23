"use client";

/**
 * Project Proposal Store — durable, client-side source of truth for the
 * proposals generated per project, kept as an ordered version history.
 *
 * Mirrors `project-pricing-store` / `project-architecture-store`: the server
 * keeps proposal data in-memory only, so this persists every generated
 * ProposalModel (as an immutable versioned snapshot) per project to
 * localStorage. The Proposal Center reads from here to group proposals by
 * project and show their version history; regenerating appends the next
 * version.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProposalModel } from "@/types";
import type { ProposalStatus } from "@/lib/types";

/** An immutable, versioned snapshot of a project's proposal. */
export interface ProposalVersion {
  id: string;
  projectId: string;
  /** 1-based, monotonically increasing per project. */
  version: number;
  status: ProposalStatus;
  /** ISO timestamp when this version was created. */
  createdAt: string;
  /** ISO timestamp of the last change to this version (status edits, etc.). */
  updatedAt: string;
  /** The full presentation-ready proposal captured for this version. */
  proposal: ProposalModel;
}

interface ProjectProposalState {
  /** projectId → every proposal version generated for that project, oldest first. */
  byProject: Record<string, ProposalVersion[]>;

  /** Append a new version (auto-incrementing the version number) and return it. */
  addVersion: (projectId: string, proposal: ProposalModel, status?: ProposalStatus) => ProposalVersion;

  /** All versions for a project, oldest → newest (empty when none exist). */
  getVersions: (projectId: string) => ProposalVersion[];

  /** The highest-numbered (newest) version for a project, or null. */
  getLatest: (projectId: string) => ProposalVersion | null;

  /** Update a single version's status. */
  setStatus: (projectId: string, versionId: string, status: ProposalStatus) => void;

  /** Remove all versions for a project. */
  clearProject: (projectId: string) => void;
}

export const useProjectProposalStore = create<ProjectProposalState>()(
  persist(
    (set, get) => ({
      byProject: {},

      addVersion: (projectId, proposal, status = "Draft") => {
        const existing = get().byProject[projectId] ?? [];
        const nextVersion = existing.reduce((max, v) => Math.max(max, v.version), 0) + 1;
        const now = new Date().toISOString();
        const version: ProposalVersion = {
          id: `prop_v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          projectId,
          version: nextVersion,
          status,
          createdAt: now,
          updatedAt: now,
          proposal,
        };
        set((state) => ({
          byProject: { ...state.byProject, [projectId]: [...existing, version] },
        }));
        return version;
      },

      getVersions: (projectId) =>
        [...(get().byProject[projectId] ?? [])].sort((a, b) => a.version - b.version),

      getLatest: (projectId) => {
        const list = get().byProject[projectId] ?? [];
        return list.length ? list.reduce((a, b) => (b.version > a.version ? b : a)) : null;
      },

      setStatus: (projectId, versionId, status) =>
        set((state) => {
          const list = state.byProject[projectId];
          if (!list) return state;
          return {
            byProject: {
              ...state.byProject,
              [projectId]: list.map((v) =>
                v.id === versionId ? { ...v, status, updatedAt: new Date().toISOString() } : v,
              ),
            },
          };
        }),

      clearProject: (projectId) =>
        set((state) => {
          const next = { ...state.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: "salespilot_project_proposals" },
  ),
);
