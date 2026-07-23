"use client";

/**
 * Workspace Settings Store — durable, client-side workspace + preference
 * settings not already owned by a dedicated store.
 *
 * Default currency is intentionally NOT duplicated here: it is owned by the
 * existing `display-currency-store`. Theme is owned by `next-themes`. This store
 * holds the remaining fields and is a thin, modular seam — later it can be
 * backed by a Firestore `workspaces/{id}/settings` document without changing any
 * consumer (same shape, same `set` API).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkspaceSettings {
  /** Workspace / company display name. */
  workspaceName: string;
  /** Company logo as a data URL (empty when none uploaded). */
  companyLogo: string;
  /** Default cloud provider for new work. */
  defaultProvider: string;
  /** IANA time zone, e.g. "UTC", "Asia/Kolkata". */
  timeZone: string;
  /** UI language code. */
  language: string;
  /** Date display format token. */
  dateFormat: string;
}

interface WorkspaceSettingsState extends WorkspaceSettings {
  /** Patch one or more settings. */
  set: (patch: Partial<WorkspaceSettings>) => void;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  workspaceName: "",
  companyLogo: "",
  defaultProvider: "AWS",
  timeZone: "UTC",
  language: "en",
  dateFormat: "MMM D, YYYY",
};

export const useWorkspaceSettingsStore = create<WorkspaceSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_WORKSPACE_SETTINGS,
      set: (patch) => set((state) => ({ ...state, ...patch })),
    }),
    { name: "salespilot_workspace_settings" },
  ),
);

/** Static option lists — extend freely for future expansion. */
export const CLOUD_PROVIDER_OPTIONS = ["AWS", "Azure", "GCP"] as const;

export const TIME_ZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
] as const;

export const DATE_FORMAT_OPTIONS = ["MMM D, YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
