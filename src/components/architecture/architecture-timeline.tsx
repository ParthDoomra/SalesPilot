/**
 * ArchitectureTimeline — Version history comparison drawer/panel.
 */

"use client";

import * as React from 'react';
import { Clock, Check } from 'lucide-react';
import type { ArchitectureModel, ArchitectureVersion } from '@/types';

interface ArchitectureTimelineProps {
  architecture: ArchitectureModel;
  versions?: ArchitectureVersion[];
}

export function ArchitectureTimeline({ architecture, versions }: ArchitectureTimelineProps) {
  // Prefer real, persisted version snapshots. Fall back to the active version
  // if the snapshot list hasn't loaded yet, so the panel always renders.
  const timeline =
    versions && versions.length > 0
      ? versions.map((v) => ({ version: v.version, changedSummary: v.changedSummary, date: v.createdAt }))
      : [
          {
            version: architecture.version,
            changedSummary: 'Initial architecture generation (V1)',
            date: architecture.createdAt,
          },
        ];

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
        Architecture Snapshots
      </h4>

      <div className="relative border-l border-border-subtle pl-4 space-y-4">
        {timeline.map((v) => {
          const isActive = v.version === architecture.version;

          return (
            <div key={v.version} className="relative">
              {/* Dot */}
              <span className={`absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full border bg-background ${
                isActive ? 'border-signal ring-2 ring-signal-soft' : 'border-border-default'
              }`}>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-signal" />}
              </span>

              <div className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Version {v.version}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    {new Date(v.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {v.changedSummary}
                </p>

                {isActive && (
                  <span className="mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-success">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
