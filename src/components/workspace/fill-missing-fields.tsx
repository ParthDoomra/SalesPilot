/**
 * FillMissingFields — focused form that asks ONLY for the requirement fields
 * that are still missing (null). Never surfaces already-captured parameters.
 * Each answer is written straight into the Requirement JSON via a manual
 * override, so the sidebar and downstream phases stay in sync.
 */

"use client";

import * as React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { FIELD_META_MAP, FIELD_QUESTIONS } from '@/constants/requirement-fields';
import type { RequirementFieldKey } from '@/types';

interface FillMissingFieldsProps {
  missingFields: RequirementFieldKey[];
  onSubmit: (values: Array<{ field: RequirementFieldKey; value: unknown }>) => Promise<void>;
}

export function FillMissingFields({ missingFields, onSubmit }: FillMissingFieldsProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Only render fields that are currently missing.
  const fields = missingFields.map((key) => FIELD_META_MAP[key]).filter(Boolean);

  function setValue(key: string, value: string) {
    setError(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    const answered = fields
      .map((meta) => ({ meta, raw: values[meta.key] }))
      .filter(({ raw }) => raw !== undefined && String(raw).trim() !== '')
      .map(({ meta, raw }) => {
        let parsed: unknown = raw.trim();
        if (meta.type === 'number') parsed = parseFloat(raw) || 0;
        if (meta.type === 'string[]') parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
        return { field: meta.key, value: parsed };
      });

    if (answered.length === 0) {
      setError('Please provide a value for at least one field before updating.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(answered);
      setValues({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to update fields.');
    } finally {
      setIsSaving(false);
    }
  }

  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber/20 bg-amber-soft/30 p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        Complete the missing fields
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        We only need the parameters below to finish the requirement analysis.
      </p>

      <div className="mt-4 space-y-3">
        {fields.map((meta) => (
          <div key={meta.key}>
            <label className="text-xs font-medium text-foreground">
              {FIELD_QUESTIONS[meta.key]}
            </label>
            {meta.type === 'select' && meta.options ? (
              <select
                value={values[meta.key] ?? ''}
                onChange={(e) => setValue(meta.key, e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-foreground focus:border-signal focus:outline-none"
              >
                <option value="">Select…</option>
                {meta.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={meta.type === 'number' ? 'number' : 'text'}
                value={values[meta.key] ?? ''}
                onChange={(e) => setValue(meta.key, e.target.value)}
                placeholder={meta.type === 'string[]' ? 'Comma-separated…' : meta.label}
                className="mt-1.5 w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-foreground focus:border-signal focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-danger">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSaving}
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
        ) : (
          <>Update Requirement JSON <ArrowRight className="h-3.5 w-3.5" /></>
        )}
      </button>
    </div>
  );
}
