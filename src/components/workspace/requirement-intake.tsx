/**
 * RequirementIntake — the primary Phase 2 workflow surface.
 *
 * Flow: provide requirements → extract structured JSON → detect missing fields
 * → complete missing fields → JSON updated → ready for architecture generation.
 *
 * Input methods (paste text is primary; conversation is optional):
 *   1. Paste requirement text   (primary)
 *   2. Upload PDF  / DOCX / Excel (placeholders)
 *   3. AI Conversation           (optional — only for clarification)
 */

"use client";

import * as React from 'react';
import {
  ClipboardPaste,
  FileText,
  FileSpreadsheet,
  FileType,
  MessagesSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { FillMissingFields } from './fill-missing-fields';
import { useRequirements } from '@/hooks/use-requirements';
import { REQUIRED_FIELDS, FIELD_META_MAP } from '@/constants/requirement-fields';
import type { RequirementFieldKey } from '@/types';

type InputMethod = 'paste' | 'pdf' | 'docx' | 'excel' | 'conversation';

interface RequirementIntakeProps {
  projectId: string;
  conversationId: string;
  onGenerateArchitecture?: () => void;
}

const METHODS: Array<{ key: InputMethod; label: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }> = [
  { key: 'paste', label: 'Paste Text', icon: ClipboardPaste },
  { key: 'pdf', label: 'Upload PDF', icon: FileText },
  { key: 'docx', label: 'Upload DOCX', icon: FileType },
  { key: 'excel', label: 'Upload Excel', icon: FileSpreadsheet },
  { key: 'conversation', label: 'AI Conversation', icon: MessagesSquare, optional: true },
];

export function RequirementIntake({ projectId, conversationId, onGenerateArchitecture }: RequirementIntakeProps) {
  const { requirement, extractFromText, overrideField } = useRequirements(projectId);

  const [method, setMethod] = React.useState<InputMethod>('paste');
  const [text, setText] = React.useState('');
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<{ count: number; message: string } | null>(null);

  const completion = requirement?.completionPercentage ?? 0;
  const missingFields = (requirement?.missingFields ?? []) as RequirementFieldKey[];
  const isComplete = completion >= 100;

  const completedRequired = REQUIRED_FIELDS.map((f) => f.key).filter((k) => !missingFields.includes(k));

  async function handleExtract() {
    if (!text.trim() || isExtracting) return;
    setIsExtracting(true);
    setError(null);
    setLastResult(null);
    const res = await extractFromText(text, 'paste');
    if (res.ok) {
      setLastResult({ count: res.changedFields?.length ?? 0, message: res.message ?? '' });
      setText('');
    } else {
      setError(res.error ?? 'Extraction failed.');
    }
    setIsExtracting(false);
  }

  async function handleFillMissing(values: Array<{ field: RequirementFieldKey; value: unknown }>) {
    for (const { field, value } of values) {
      await overrideField(field, value);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-5 p-5">
        {/* Header */}
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Requirement Intake</h3>
          <p className="text-xs text-muted-foreground">
            Provide the client requirement and we&apos;ll extract a structured Requirement JSON —
            the single source of truth for architecture, pricing, and proposals.
          </p>
        </div>

        {/* Input method selector */}
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'border-signal bg-signal-soft text-signal'
                    : 'border-border-default bg-surface text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
                {m.optional && (
                  <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[9px] text-muted-foreground/70">
                    optional
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Method body */}
        {method === 'paste' && (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the customer's requirement here — e.g. company, industry, users, region, budget, cloud, database, compliance, availability…"
              className="h-48 w-full resize-y rounded-xl border border-border-default bg-surface p-4 text-sm text-foreground focus:border-signal focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/70">
                Primary method — extraction runs automatically on your pasted text.
              </span>
              <button
                onClick={handleExtract}
                disabled={!text.trim() || isExtracting}
                className="flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isExtracting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Extract Requirements</>
                )}
              </button>
            </div>
          </div>
        )}

        {(method === 'pdf' || method === 'docx' || method === 'excel') && (
          <UploadPlaceholder method={method} />
        )}

        {method === 'conversation' && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground/70">
              Conversation is optional — use it to clarify missing fields, ask questions, or explain
              the extracted requirements. Extracted values flow into the same Requirement JSON.
            </p>
            <div className="h-[420px] overflow-hidden rounded-xl border border-border-subtle bg-background">
              <ChatPanel projectId={projectId} conversationId={conversationId} />
            </div>
          </div>
        )}

        {/* Extraction feedback */}
        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
            {error}
          </div>
        )}
        {lastResult && !error && (
          <div className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-xs text-success">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Extracted {lastResult.count} field{lastResult.count === 1 ? '' : 's'} into the Requirement JSON.
            </div>
            {lastResult.message && (
              <p className="mt-1 text-success/80">{lastResult.message}</p>
            )}
          </div>
        )}

        {/* Missing field detection */}
        {requirement && (
          <MissingFieldDetection
            completedFields={completedRequired}
            missingFields={missingFields}
            completion={completion}
          />
        )}

        {/* Fill missing fields — only asks for what is missing */}
        {requirement && missingFields.length > 0 && (
          <FillMissingFields missingFields={missingFields} onSubmit={handleFillMissing} />
        )}

        {/* Completion / readiness */}
        {requirement && isComplete && (
          <div className="rounded-xl border border-success/30 bg-success-soft/40 p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <h4 className="mt-3 font-display text-base font-semibold text-foreground">
              Requirement Analysis Complete
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Readiness <span className="font-semibold text-success">100%</span> — every required
              field is captured in the Requirement JSON.
            </p>
            <button
              onClick={onGenerateArchitecture}
              disabled={!onGenerateArchitecture}
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg bg-signal px-5 py-2.5 text-sm font-medium text-signal-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Generate Architecture <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MissingFieldDetection({
  completedFields,
  missingFields,
  completion,
}: {
  completedFields: RequirementFieldKey[];
  missingFields: RequirementFieldKey[];
  completion: number;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-foreground">Requirement Analysis</h4>
        <span className="text-xs text-muted-foreground">
          Readiness <span className="font-semibold text-foreground">{completion}%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Completed */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed ({completedFields.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {completedFields.length === 0 && (
              <span className="text-[11px] text-muted-foreground/60">Nothing captured yet.</span>
            )}
            {completedFields.map((key) => (
              <span
                key={key}
                className="rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success"
              >
                {FIELD_META_MAP[key]?.label ?? key}
              </span>
            ))}
          </div>
        </div>

        {/* Missing */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing ({missingFields.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.length === 0 && (
              <span className="text-[11px] text-muted-foreground/60">All required fields captured.</span>
            )}
            {missingFields.map((key) => (
              <span
                key={key}
                className="rounded-full border border-amber/20 bg-amber-soft px-2 py-0.5 text-[10px] font-medium text-amber"
              >
                {FIELD_META_MAP[key]?.label ?? key}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadPlaceholder({ method }: { method: 'pdf' | 'docx' | 'excel' }) {
  const label = method.toUpperCase();
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-muted-foreground">
        <FileText className="h-6 w-6" />
      </div>
      <h4 className="mt-4 font-display text-sm font-semibold text-foreground">
        {label} upload coming soon
      </h4>
      <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
        Document parsing for {label} files is not wired up yet. For now, open the document, copy the
        requirement text, and use <span className="font-medium text-foreground">Paste Text</span> to
        extract it.
      </p>
      <button
        disabled
        className="mx-auto mt-4 flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border-default bg-surface px-4 py-2 text-xs font-medium text-muted-foreground/60"
      >
        <FileText className="h-3.5 w-3.5" /> Select {label} file
      </button>
    </div>
  );
}
