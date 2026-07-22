/**
 * DecisionPanel — Displays the decision logs and cloud fit rationale.
 */

"use client";

import * as React from 'react';
import { Settings, Info } from 'lucide-react';
import type { DecisionLog, CloudRecommendation } from '@/types';

interface DecisionPanelProps {
  logs: DecisionLog[];
  recommendations: CloudRecommendation[];
  selectedProvider: string;
}

export function DecisionPanel({ logs, recommendations, selectedProvider }: DecisionPanelProps) {
  const selectedRec = recommendations.find((r) => r.provider === selectedProvider);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-border-subtle/50 pb-3">
        <Settings className="h-4 w-4 text-signal" />
        <h4 className="font-display text-sm font-semibold text-foreground">
          Decision Engine Analytics
        </h4>
      </div>

      {/* Cloud recommendations breakdown */}
      {selectedRec && (
        <div className="space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-foreground">
              Provider Rationale — {selectedRec.provider} ({selectedRec.score}% match)
            </h5>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {selectedRec.fitReasoning}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg bg-success-soft/30 border border-success/10 p-3">
              <span className="font-semibold text-success">Pros / Optimizations</span>
              <ul className="mt-1.5 list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                {selectedRec.pros.slice(0, 3).map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className="rounded-lg bg-surface-raised border border-border-subtle p-3">
              <span className="font-semibold text-muted-foreground">Considerations</span>
              <ul className="mt-1.5 list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                {selectedRec.cons.slice(0, 3).map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="border-t border-border-subtle/50 pt-4">
          <h5 className="text-xs font-semibold text-foreground mb-3">
            Triggered Architectural Rules
          </h5>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 rounded-lg bg-surface-raised p-3 text-[11px] border border-border-subtle/50"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">{log.ruleTriggered}</span>
                  <p className="mt-1 text-muted-foreground/80">{log.decision}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
