/**
 * AiRecommendationCard — shown when the AI's merit-based best cloud provider
 * differs from the customer's preferred provider. Explains why, shows a score
 * and (when available) an estimated cost difference, and offers two actions.
 */

"use client";

import { Sparkles, Check, ArrowRight } from 'lucide-react';
import type { ProviderRecommendation } from '@/services/ai/cloud-recommender';

interface AiRecommendationCardProps {
  recommendation: ProviderRecommendation;
  busy?: boolean;
  onUseRecommendation: () => void;
  onKeepPreference: () => void;
}

export function AiRecommendationCard({
  recommendation,
  busy,
  onUseRecommendation,
  onKeepPreference,
}: AiRecommendationCardProps) {
  const { recommended, recommendedScore, preferred, reasons, costDifferenceUsd } = recommendation;

  const reasonText =
    reasons.length > 0
      ? reasons.slice(0, 3).join(', ')
      : 'a better overall fit for the stated requirements';

  const cheaper = costDifferenceUsd !== null && costDifferenceUsd > 0;
  const pricier = costDifferenceUsd !== null && costDifferenceUsd < 0;

  return (
    <div className="rounded-xl border border-signal/40 bg-signal-soft/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal text-signal-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm font-semibold text-foreground">
                AI recommends {recommended}
              </h4>
              <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-semibold text-signal">
                Score {recommendedScore}/100
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on your requirements, <strong className="text-foreground">{recommended}</strong> is a
              stronger fit than your preferred provider
              {preferred ? <> (<strong className="text-foreground">{preferred}</strong>)</> : null} — {reasonText}.
            </p>
            {(cheaper || pricier) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimated cost impact:{' '}
                <strong className={cheaper ? 'text-success' : 'text-amber'}>
                  {cheaper ? '≈ save ' : '≈ + '}${Math.abs(costDifferenceUsd as number).toLocaleString()}/mo
                </strong>{' '}
                <span className="text-muted-foreground/60">(estimate)</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onKeepPreference}
            disabled={busy}
            className="rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-signal/50 disabled:opacity-50"
          >
            Keep {preferred ?? 'preference'}
          </button>
          <button
            onClick={onUseRecommendation}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 shadow-sm disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Use {recommended} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
