/**
 * CompatibilityWarningPanel — Alerts the user on budget vs requirement conflicts.
 */

"use client";

import * as React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { CompatibilityWarning } from '@/types';

interface CompatibilityWarningPanelProps {
  warnings: CompatibilityWarning[];
}

export function CompatibilityWarningPanel({ warnings }: CompatibilityWarningPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warn) => {
        const isError = warn.severity === 'error';
        const isWarning = warn.severity === 'warning';
        const Icon = isError ? ShieldAlert : isWarning ? AlertTriangle : Info;

        return (
          <div
            key={warn.id}
            className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
              isError
                ? 'border-danger/20 bg-danger-soft text-danger'
                : isWarning
                  ? 'border-amber/20 bg-amber-soft text-amber'
                  : 'border-signal/20 bg-signal-soft text-signal'
            }`}
          >
            <span className="rounded-lg bg-surface p-1.5 shadow-sm shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <h5 className="font-semibold">{warn.title}</h5>
              <p className="opacity-90">{warn.description}</p>
              <p className="font-medium mt-1">
                <strong>Mitigation:</strong> {warn.mitigation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
