"use client";

/**
 * Project Activity Store — durable, client-side log of project events that have
 * no other derivable trace (requirement uploads/analysis, proposal downloads,
 * status changes).
 *
 * The Activity tab MERGES these logged events with events derived from the
 * persisted project/architecture/pricing/proposal stores, so existing projects
 * always show a timeline even before any new event is recorded. Follows the same
 * persisted-zustand pattern as the other project stores.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivitySource = "user" | "ai";

export type ActivityType =
  | "project_created"
  | "requirements_uploaded"
  | "requirement_analysis"
  | "architecture_generated"
  | "architecture_regenerated"
  | "pricing_generated"
  | "proposal_generated"
  | "proposal_edited"
  | "proposal_downloaded"
  | "status_changed";

export interface ActivityEvent {
  id: string;
  projectId: string;
  type: ActivityType;
  title: string;
  detail?: string;
  source: ActivitySource;
  /** ISO timestamp. */
  timestamp: string;
}

/** The shape callers provide — id/projectId/timestamp are filled in. */
export type ActivityInput = Omit<ActivityEvent, "id" | "projectId" | "timestamp"> & {
  timestamp?: string;
};

interface ActivityState {
  /** projectId → recorded events (append order). */
  byProject: Record<string, ActivityEvent[]>;
  logActivity: (projectId: string, event: ActivityInput) => void;
  getEvents: (projectId: string) => ActivityEvent[];
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      byProject: {},

      logActivity: (projectId, event) => {
        if (!projectId) return;
        const entry: ActivityEvent = {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          projectId,
          type: event.type,
          title: event.title,
          detail: event.detail,
          source: event.source,
          timestamp: event.timestamp ?? new Date().toISOString(),
        };
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: [...(state.byProject[projectId] ?? []), entry],
          },
        }));
      },

      getEvents: (projectId) => get().byProject[projectId] ?? [],
    }),
    { name: "salespilot_project_activity" },
  ),
);

/**
 * Non-hook logger so plain stores/services (projects-store, proposal-export)
 * can record activity outside of a React render.
 */
export function logActivity(projectId: string, event: ActivityInput): void {
  useActivityStore.getState().logActivity(projectId, event);
}
