/**
 * useRequirements — manages requirement model state, manual overrides,
 * and version history.
 */

"use client";

import * as React from 'react';
import { useRequirementStore } from '@/features/workspace/stores/requirement-store';
import { syncProjectFromRequirement } from '@/lib/project-currency';
import { logActivity } from '@/lib/activity-store';
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
        if (data.requirement) {
          syncProjectFromRequirement(projectId, data.requirement);
        }
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
  async function overrideField(
    field: RequirementFieldKey,
    value: unknown,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequirement(data.requirement);
        if (data.requirement) {
          syncProjectFromRequirement(projectId, data.requirement);
        }
        setEditingField(null);
        return { ok: true };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Failed to save update.' };
    } catch {
      return { ok: false, error: 'Network error saving update.' };
    }
  }

  /**
   * Apply manual overrides to multiple fields in a single batch request.
   */
  async function overrideFields(
    fields: Array<{ field: RequirementFieldKey; value: unknown }>,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequirement(data.requirement);
        if (data.requirement) {
          syncProjectFromRequirement(projectId, data.requirement);
        }
        setEditingField(null);
        return { ok: true };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Failed to save updates.' };
    } catch {
      return { ok: false, error: 'Network error saving updates.' };
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
      if (data.requirement) {
        syncProjectFromRequirement(projectId, data.requirement);
      }
      // Record the upload + the AI extraction/analysis for the Activity timeline.
      logActivity(projectId, {
        type: 'requirements_uploaded',
        title: 'Requirements uploaded',
        detail: sourceType === 'paste' ? 'Pasted text' : sourceType,
        source: 'user',
      });
      logActivity(projectId, {
        type: 'requirement_analysis',
        title: 'AI requirement analysis completed',
        source: 'ai',
      });
      return { ok: true, changedFields: data.changedFields, message: data.message };
    } catch {
      return { ok: false, error: 'Failed to extract requirements.' };
    }
  }

  /**
   * Document upload action: uploads PDF, DOCX, or Excel file and extracts structured requirements.
   */
  async function extractFromDocument(
    file: File,
    intakeMethod: 'pdf' | 'docx' | 'excel',
  ): Promise<{ ok: boolean; changedFields?: RequirementFieldKey[]; message?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('intakeMethod', intakeMethod);

      const res = await fetch('/api/requirements/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || `Failed to parse ${intakeMethod.toUpperCase()} document.` };
      }

      setRequirement(data.requirement);
      if (data.requirement) {
        syncProjectFromRequirement(projectId, data.requirement);
      }

      logActivity(projectId, {
        type: 'requirements_uploaded',
        title: `${intakeMethod.toUpperCase()} requirement document uploaded`,
        detail: file.name,
        source: 'user',
      });
      logActivity(projectId, {
        type: 'requirement_analysis',
        title: `AI requirement analysis completed from ${intakeMethod.toUpperCase()}`,
        source: 'ai',
      });

      return { ok: true, changedFields: data.changedFields, message: data.message };
    } catch {
      return { ok: false, error: `Failed to process ${intakeMethod.toUpperCase()} upload.` };
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
    overrideFields,
    extractFromText,
    extractFromDocument,
    setEditingField,
  };
}
