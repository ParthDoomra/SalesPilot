/**
 * Version History — shows diffs between requirement versions.
 */

"use client";

import * as React from 'react';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRequirements } from '@/hooks/use-requirements';
import { FIELD_META_MAP } from '@/constants/requirement-fields';
import type { RequirementVersion, RequirementField } from '@/types';

interface VersionHistoryProps {
  projectId: string;
  onClose: () => void;
}

export function VersionHistory({ projectId, onClose }: VersionHistoryProps) {
  const { versions, loadVersions } = useRequirements(projectId);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    loadVersions();
  }, [projectId]);

  const selected = selectedIdx !== null ? versions[selectedIdx] : null;
  const previous = selectedIdx !== null && selectedIdx > 0 ? versions[selectedIdx - 1] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-sm font-semibold">Version History</h3>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Version list */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-border-subtle p-2">
          {versions.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground/60">
              No versions yet
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {versions.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left transition-colors',
                    selectedIdx === idx
                      ? 'bg-signal-soft border border-signal/20'
                      : 'hover:bg-surface-raised',
                  )}
                >
                  <div className="text-xs font-medium text-foreground">
                    Version {v.version}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {v.changedFields.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="rounded bg-success-soft px-1 py-0.5 text-[8px] font-medium text-success"
                      >
                        {FIELD_META_MAP[f]?.label ?? f}
                      </span>
                    ))}
                    {v.changedFields.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">
                        +{v.changedFields.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Diff view */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60">
              Select a version to view changes
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                Changes in Version {selected.version}
              </h4>
              {selected.changedFields.map((key) => {
                const meta = FIELD_META_MAP[key];
                const currentField = selected.snapshot[key] as RequirementField<unknown> | undefined;
                const previousField = previous?.snapshot[key] as RequirementField<unknown> | undefined;

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border-subtle bg-surface p-3"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {meta?.label ?? key}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="rounded bg-danger-soft px-2 py-0.5 text-xs text-danger line-through">
                        {formatFieldValue(previousField?.value)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                      <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        {formatFieldValue(currentField?.value)}
                      </span>
                    </div>
                    {currentField && (
                      <div className="mt-1 text-[10px] text-muted-foreground/50">
                        Confidence: {currentField.confidence}% · Source: {currentField.source}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
