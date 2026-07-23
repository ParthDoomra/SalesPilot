/**
 * Requirement Panel — live sidebar showing all extracted fields,
 * confidence scores, completion progress, inline editing, and a JSON view
 * for passing to the Phase 3 Architecture Generator.
 */

"use client";

import * as React from 'react';
import { ClipboardList, History, Code, Check, Copy, Sparkles, Layers } from 'lucide-react';
import { RequirementFieldRow } from './requirement-field';
import { RequirementProgress } from './requirement-progress';
import { useRequirements } from '@/hooks/use-requirements';
import { REQUIREMENT_FIELD_META, FIELD_GROUPS } from '@/constants/requirement-fields';
import type { RequirementField, RequirementFieldKey, RequirementModel } from '@/types';
import { REQUIREMENT_FIELD_KEYS, emptyField } from '@/types';

interface RequirementPanelProps {
  projectId: string;
  onShowVersions?: () => void;
}

export function RequirementPanel({ projectId, onShowVersions }: RequirementPanelProps) {
  const {
    requirement,
    editingField,
    isLoading,
    overrideField,
    setEditingField,
  } = useRequirements(projectId);

  const [viewMode, setViewMode] = React.useState<'visual' | 'json'>('visual');
  const [copiedJson, setCopiedJson] = React.useState(false);

  if (isLoading && !requirement) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          onShowVersions={onShowVersions}
        />
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          onShowVersions={onShowVersions}
        />
        <div className="flex flex-1 items-center justify-center p-4 text-center">
          <div>
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              Paste or upload requirements to extract the structured JSON
            </p>
          </div>
        </div>
      </div>
    );
  }

  const exportPayload = buildPhase3ArchitecturePayload(requirement);

  async function handleCopyJson() {
    await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        onShowVersions={onShowVersions}
      />

      <div className="flex-1 overflow-y-auto p-3">
        {/* Progress header */}
        <RequirementProgress
          completionPercentage={requirement.completionPercentage}
          missingFields={requirement.missingFields}
        />

        {/* View mode toggle */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-raised p-1">
          <button
            onClick={() => setViewMode('visual')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              viewMode === 'visual'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Structured View
          </button>

          <button
            onClick={() => setViewMode('json')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              viewMode === 'json'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="h-3.5 w-3.5" /> Architecture JSON (Phase 3)
          </button>
        </div>

        {viewMode === 'visual' ? (
          /* Visual Structured View */
          <div className="mt-4 space-y-4">
            {FIELD_GROUPS.map((group) => {
              const fields = REQUIREMENT_FIELD_META.filter((f) => f.group === group.key);
              return (
                <div key={group.key}>
                  <h4 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </h4>
                  <div className="rounded-lg border border-border-subtle bg-surface">
                    {fields.map((meta) => {
                      const field = (requirement[meta.key] as RequirementField<unknown> | undefined) ?? emptyField();
                      return (
                        <RequirementFieldRow
                          key={meta.key}
                          meta={meta}
                          field={field}
                          isEditing={editingField === meta.key}
                          onStartEdit={() => setEditingField(meta.key)}
                          onSave={(value) => overrideField(meta.key, value)}
                          onCancel={() => setEditingField(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* JSON Export View for Phase 3 Architecture Generator */
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                <Sparkles className="h-3.5 w-3.5" /> Phase 3 Generator Ready
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 rounded-md border border-border-default bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-signal/50"
              >
                {copiedJson ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-background p-3 font-mono text-[11px] text-foreground leading-relaxed">
              {JSON.stringify(exportPayload, null, 2)}
            </pre>
          </div>
        )}

        {/* Version info */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 text-center text-[10px] text-muted-foreground/60">
          Version {requirement.version} · Last updated{' '}
          {new Date(requirement.updatedAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  viewMode,
  setViewMode,
  onShowVersions,
}: {
  viewMode: 'visual' | 'json';
  setViewMode: (mode: 'visual' | 'json') => void;
  onShowVersions?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-signal" />
        <h3 className="font-display text-sm font-semibold">Requirements</h3>
      </div>
      {onShowVersions && (
        <button
          onClick={onShowVersions}
          className="rounded p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
          title="Version history"
        >
          <History className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Transforms the RequirementModel into a clean, canonical JSON payload
 * ready for consumption by Phase 3 (Architecture Generator).
 */
function buildPhase3ArchitecturePayload(req: RequirementModel) {
  const structuredRequirements: Record<string, unknown> = {};
  for (const key of REQUIREMENT_FIELD_KEYS) {
    const f = req[key] as RequirementField<unknown> | undefined;
    structuredRequirements[key] = {
      value: f?.value ?? null,
      confidence: f?.confidence ?? 0,
      source: f?.source ?? 'ai',
    };
  }

  return {
    projectId: req.projectId,
    requirementId: req.id,
    version: req.version,
    completionPercentage: req.completionPercentage,
    missingFields: req.missingFields,
    requirements: structuredRequirements,
    phase3Ready: req.completionPercentage >= 50,
  };
}
