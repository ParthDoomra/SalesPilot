/**
 * Requirement Field — individual field display with confidence badge,
 * inline editing, and source indicator.
 */

"use client";

import * as React from 'react';
import { Pencil, Check, X, Bot, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequirementField, RequirementFieldKey } from '@/types';
import type { FieldMeta } from '@/constants/requirement-fields';

interface RequirementFieldRowProps {
  meta: FieldMeta;
  field: RequirementField<unknown>;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

export function RequirementFieldRow({
  meta,
  field,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: RequirementFieldRowProps) {
  const safeField = field ?? { value: null, confidence: 0, source: 'ai', aiValue: null, manualOverride: null, updatedAt: new Date().toISOString() };
  const [editValue, setEditValue] = React.useState('');

  React.useEffect(() => {
    if (isEditing) {
      setEditValue(formatValueForEdit(safeField.value));
    }
  }, [isEditing, safeField.value]);

  const hasValue = safeField.value !== null && safeField.value !== undefined;
  const isLowConfidence = hasValue && safeField.confidence < 70;

  function handleSave() {
    let parsed: unknown = editValue;
    if (meta.type === 'number') parsed = parseFloat(editValue) || 0;
    if (meta.type === 'string[]') parsed = editValue.split(',').map((s) => s.trim()).filter(Boolean);
    onSave(parsed);
  }

  return (
    <div
      className={cn(
        'group flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-raised/50',
        isLowConfidence && 'border-l-2 border-amber',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
          {hasValue && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                field.source === 'manual'
                  ? 'bg-signal-soft text-signal'
                  : 'bg-surface-raised text-muted-foreground',
              )}
            >
              {field.source === 'manual' ? (
                <><UserIcon className="h-2 w-2" /> Manual</>
              ) : (
                <><Bot className="h-2 w-2" /> AI</>
              )}
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 flex items-center gap-1.5">
            {meta.type === 'select' && meta.options ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded border border-border-default bg-background px-2 py-1 text-sm text-foreground focus:border-signal focus:outline-none"
              >
                <option value="">Select…</option>
                {meta.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={meta.type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded border border-border-default bg-background px-2 py-1 text-sm text-foreground focus:border-signal focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            )}
            <button
              onClick={handleSave}
              className="rounded p-1 text-success hover:bg-success-soft"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onCancel}
              className="rounded p-1 text-muted-foreground hover:bg-surface-raised"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-2">
            {hasValue ? (
              <span className="text-sm font-medium text-foreground">
                {formatDisplayValue(field.value, meta)}
              </span>
            ) : (
              <span className="text-sm italic text-muted-foreground/50">Pending</span>
            )}
          </div>
        )}
      </div>

      {/* Right side: confidence + edit */}
      <div className="flex shrink-0 items-center gap-1.5">
        {hasValue && !isEditing && (
          <ConfidenceBadge confidence={field.confidence} />
        )}
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-raised hover:text-foreground"
            title="Edit value"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const isLow = confidence < 70;
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[9px] font-mono font-medium',
        isLow
          ? 'bg-amber-soft text-amber'
          : confidence >= 90
            ? 'bg-success-soft text-success'
            : 'bg-surface-raised text-muted-foreground',
      )}
    >
      {confidence}%
    </span>
  );
}

function formatValueForEdit(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function formatDisplayValue(value: unknown, meta: FieldMeta): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (meta.type === 'number' && typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}
