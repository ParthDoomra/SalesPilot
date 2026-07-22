/**
 * Requirement Store — client-side state for the live requirement model.
 *
 * Tracks the current requirement, completion %, validation issues,
 * and field editing state.
 */

"use client";

import { create } from 'zustand';
import type { RequirementModel, ValidationIssue, RequirementVersion, RequirementFieldKey } from '@/types';

interface RequirementState {
  /** Current requirement model. */
  requirement: RequirementModel | null;
  /** Validation issues from the last check. */
  validationIssues: ValidationIssue[];
  /** Version history. */
  versions: RequirementVersion[];
  /** Field currently being edited (inline edit mode). */
  editingField: RequirementFieldKey | null;
  /** Whether the requirement panel is loading. */
  isLoading: boolean;

  // Actions
  setRequirement: (requirement: RequirementModel) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  setVersions: (versions: RequirementVersion[]) => void;
  addVersion: (version: RequirementVersion) => void;
  setEditingField: (field: RequirementFieldKey | null) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  requirement: null,
  validationIssues: [],
  versions: [],
  editingField: null,
  isLoading: false,
};

export const useRequirementStore = create<RequirementState>()((set, get) => ({
  ...initialState,

  setRequirement: (requirement) => set({ requirement }),

  setValidationIssues: (issues) => set({ validationIssues: issues }),

  setVersions: (versions) => set({ versions }),

  addVersion: (version) =>
    set({ versions: [...get().versions, version] }),

  setEditingField: (field) => set({ editingField: field }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));
