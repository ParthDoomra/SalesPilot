/**
 * useArchitecture — Custom hook for generating, fetching, selecting options,
 * and exporting cloud solutions.
 */

"use client";

import * as React from 'react';
import { useArchitectureStore } from '@/features/workspace/stores/architecture-store';
import { useProjectArchitectureStore } from '@/lib/project-architecture-store';
import type { CloudProvider, ArchitectureModel, ArchitectureOption, ArchitectureVersion } from '@/types';

export function useArchitecture(projectId: string) {
  const {
    isGenerating,
    isUpdating,
    error,
    exportOpen,
    setIsGenerating,
    setIsUpdating,
    setError,
    setExportOpen,
  } = useArchitectureStore();

  // SINGLE SOURCE OF TRUTH for architecture data. The Architecture page and the
  // Pricing module both read from this persisted store, so there is no duplicated
  // architecture state to keep in sync.
  const architecture = useProjectArchitectureStore((s) => s.byProject[projectId] ?? null);
  const persistArchitecture = useProjectArchitectureStore((s) => s.setArchitecture);

  const selectedOptionId = architecture?.selectedOptionId ?? null;
  const selectedProvider = architecture?.selectedProvider ?? null;

  const syncArchitecture = React.useCallback(
    (arch: ArchitectureModel | null) => {
      persistArchitecture(projectId, arch);
    },
    [projectId, persistArchitecture],
  );

  const [versions, setVersions] = React.useState<ArchitectureVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = React.useState(false);

  React.useEffect(() => {
    if (projectId) {
      loadArchitecture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadArchitecture() {
    setError(null);
    try {
      const res = await fetch(`/api/architecture?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.architecture) {
          syncArchitecture(data.architecture);
          await loadVersions();
          return;
        }
      }
      // Server has no architecture (e.g. its in-memory store was reset). The
      // persisted store IS the source of truth, so if it already holds one the
      // page keeps showing it — we never falsely report "no architecture".
      if (useProjectArchitectureStore.getState().getArchitecture(projectId)) {
        await loadVersions();
      }
    } catch {
      if (!useProjectArchitectureStore.getState().getArchitecture(projectId)) {
        setError('Failed to load architecture.');
      }
    }
  }

  async function generate(providerOverride?: CloudProvider) {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/architecture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, providerOverride }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate solution.');
      }

      const data = await res.json();
      syncArchitecture(data.architecture);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating solution.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function selectOption(optionId: string) {
    if (!architecture) return;
    // No-op guard: don't bump the version / create a snapshot for re-selecting
    // the option that is already active.
    if (optionId === selectedOptionId) return;
    setIsUpdating(true);
    setError(null);

    // Optimistically update the persisted project state first, so the selection
    // sticks even if the server round-trip fails (its in-memory store may have
    // been reset). The server call below only adds a version snapshot on top.
    const optimistic: ArchitectureModel = { ...architecture, selectedOptionId: optionId };
    syncArchitecture(optimistic);

    try {
      const res = await fetch('/api/architecture/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Send the full architecture so the server can self-heal (re-seed) if
        // its in-memory store lost this project's architecture.
        body: JSON.stringify({ projectId, selectedOptionId: optionId, architecture: optimistic }),
      });

      if (res.ok) {
        const data = await res.json();
        syncArchitecture(data.architecture);
        await loadVersions();
      }
      // A non-OK response is non-fatal: the optimistic client state above is the
      // source of truth for the Architecture and Pricing views.
    } catch {
      // Ignore — selection is already persisted client-side.
    } finally {
      setIsUpdating(false);
    }
  }

  async function selectProvider(provider: CloudProvider) {
    await generate(provider);
  }

  async function updateOption(updatedOption: ArchitectureOption) {
    if (!architecture) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/architecture/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, updatedOption, architecture }),
      });

      if (res.ok) {
        const data = await res.json();
        syncArchitecture(data.architecture);
        await loadVersions();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save service changes.');
      }
    } catch {
      setError('Failed to save service changes.');
    } finally {
      setIsUpdating(false);
    }
  }

  async function loadVersions() {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/architecture/versions?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(Array.isArray(data.versions) ? data.versions : []);
      }
    } catch {
      // Non-fatal: the timeline falls back to the active version if this fails.
    } finally {
      setLoadingVersions(false);
    }
  }

  return {
    architecture,
    selectedOptionId,
    selectedProvider,
    isGenerating,
    isUpdating,
    error,
    exportOpen,
    versions,
    loadingVersions,
    generate,
    selectOption,
    selectProvider,
    updateOption,
    loadVersions,
    setExportOpen,
  };
}
