/**
 * Requirement Progress — circular/bar progress indicator with missing field list.
 */

"use client";

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_META_MAP } from '@/constants/requirement-fields';
import type { RequirementFieldKey } from '@/types';

interface RequirementProgressProps {
  completionPercentage: number;
  missingFields: RequirementFieldKey[];
}

export function RequirementProgress({ completionPercentage, missingFields }: RequirementProgressProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (completionPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface p-4">
      {/* Circular progress */}
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={completionPercentage >= 70 ? 'var(--success)' : completionPercentage >= 40 ? 'var(--amber)' : 'var(--danger)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-foreground">{completionPercentage}%</span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs font-medium text-muted-foreground">Requirement Completion</div>
      </div>

      {/* Missing fields */}
      {missingFields.length > 0 && (
        <div className="w-full">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber">
            <AlertCircle className="h-3 w-3" />
            Missing ({missingFields.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map((key) => {
              const meta = FIELD_META_MAP[key];
              return (
                <span
                  key={key}
                  className="rounded-full border border-amber/20 bg-amber-soft px-2 py-0.5 text-[10px] font-medium text-amber"
                >
                  {meta?.label ?? key}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
