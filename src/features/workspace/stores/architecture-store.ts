/**
 * Architecture Store — transient, per-session UI flags for Phase 3.
 *
 * NOTE: The architecture *data* (the ArchitectureModel, its selected option and
 * provider) is NOT held here. It lives in a single source of truth — the
 * persisted `useProjectArchitectureStore` (see `@/lib/project-architecture-store`)
 * — which both the Architecture page and the Pricing module read from. This
 * store only tracks ephemeral view state (generation/updating spinners, the
 * last error, and whether the export dialog is open).
 */

"use client";

import { create } from 'zustand';

interface ArchitectureUiState {
  isGenerating: boolean;
  isUpdating: boolean;
  error: string | null;
  exportOpen: boolean;

  setIsGenerating: (generating: boolean) => void;
  setIsUpdating: (updating: boolean) => void;
  setError: (error: string | null) => void;
  setExportOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  isGenerating: false,
  isUpdating: false,
  error: null,
  exportOpen: false,
};

export const useArchitectureStore = create<ArchitectureUiState>()((set) => ({
  ...initialState,

  setIsGenerating: (generating) => set({ isGenerating: generating }),

  setIsUpdating: (updating) => set({ isUpdating: updating }),

  setError: (error) => set({ error }),

  setExportOpen: (open) => set({ exportOpen: open }),

  reset: () => set(initialState),
}));
