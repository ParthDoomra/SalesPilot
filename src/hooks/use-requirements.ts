/**
 * useRequirements — manages requirement model state, manual overrides,
 * and version history.
 */

"use client";

import * as React from 'react';
import { useRequirementStore } from '@/features/workspace/stores/requirement-store';
import type { RequirementFieldKey } from '@/types';

export function useRequirements(projectId: string) {
  const {
    requirement,
    validationIssues,
    versions,
    editingField,
    isLoading,
    setRequirement,
    setVersions,
    setEditingField,
    setIsLoading,
  } = useRequirementStore();

  // Load requirement on mount
  React.useEffect(() => {
    if (projectId) loadRequirement();
  }, [projectId]);

  async function loadRequirement() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements`);
      if (res.ok) {
        const data = await res.json();
        setRequirement(data.requirement);
      }
    } catch {
      // Silent fail — requirement stays null
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVersions() {
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
      }
    } catch {
      // Silent fail
    }
  }

  /**
   * Apply a manual override to a field.
   */
  async function overrideField(field: RequirementFieldKey, value: unknown) {
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequirement(data.requirement);
        setEditingField(null);
      }
    } catch {
      // Silent fail
    }
  }

  /**
   * Primary Phase 2 action: extract a structured Requirement JSON from pasted
   * (or document) text. Updates the shared requirement store on success.
   */
  async function extractFromText(
    text: string,
    sourceType = 'paste',
  ): Promise<{ ok: boolean; changedFields?: RequirementFieldKey[]; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/requirements/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text, sourceType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to extract requirements.' };
      }
      setRequirement(data.requirement);
      return { ok: true, changedFields: data.changedFields, message: data.message };
    } catch {
      return { ok: false, error: 'Failed to extract requirements.' };
    }
  }

  return {
    requirement,
    validationIssues,
    versions,
    editingField,
    isLoading,
    loadRequirement,
    loadVersions,
    overrideField,
    extractFromText,
    setEditingField,
  };
}
