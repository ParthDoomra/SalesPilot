/**
 * CostExplanation — the AI narrative for the estimate: a plain-language
 * explanation, the top cost drivers, and (only when over budget) actionable
 * recommendations to bring the architecture within the customer's budget.
 */

"use client";

import * as React from 'react';
import { Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OptionCostEstimate } from '@/types';
import { formatMoney } from './format';

interface CostExplanationProps {
  option: OptionCostEstimate;
  currencySymbol: string;
}

export function CostExplanation({ option, currencySymbol }: CostExplanationProps) {
  const topDrivers = [...option.resources].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 3);
  const showRecommendations = option.recommendations.length > 0;
  const opt = option.optimization;
  // Over budget → the recommendations are required fixes; otherwise they are
  // optional savings opportunities.
  const isRequired = opt?.isRequired ?? false;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* AI explanation + top drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-signal" /> AI cost explanation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{option.explanation}</p>

          <div>
            <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-signal" /> Top cost drivers
            </h5>
            <div className="space-y-2">
              {topDrivers.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-soft text-[10px] font-semibold text-signal">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{r.serviceName}</div>
                      <div className="text-[10px] text-muted-foreground/70">{r.category}</div>
                    </div>
                  </div>
                  <span className="font-mono-data text-xs font-semibold text-foreground">
                    {formatMoney(r.monthlyCost, currencySymbol)}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations — required fixes when over budget, optional savings otherwise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber" />{' '}
            {isRequired ? 'Recommendations' : 'Optional savings opportunities'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRequired && (
            <div className="flex items-center gap-2">
              <Badge variant="success">Within budget</Badge>
              <span className="text-xs text-muted-foreground">
                No changes required — the options below are optional.
              </span>
            </div>
          )}

          {showRecommendations && (
            <ul className="space-y-2.5">
              {option.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-soft text-[9px] font-semibold text-amber">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          )}

          {/* Projected impact of applying the recommendations */}
          {opt && opt.estimatedMonthlySavings > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-raised/40 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Projected impact
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <ImpactRow label="Estimated savings" value={`${formatMoney(opt.estimatedMonthlySavings, currencySymbol)}/mo`} tone="text-success" />
                <ImpactRow label="New monthly cost" value={formatMoney(opt.newMonthlyCost, currencySymbol)} />
                <ImpactRow label="New yearly cost" value={formatMoney(opt.newYearlyCost, currencySymbol)} />
                <ImpactRow
                  label="Updated status"
                  value={opt.newStatus === 'within' ? 'Within Budget' : opt.newStatus === 'over' ? 'Over Budget' : '—'}
                  tone={opt.newStatus === 'within' ? 'text-success' : opt.newStatus === 'over' ? 'text-danger' : undefined}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImpactRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground/70">{label}</span>
      <span className={`font-mono-data font-semibold ${tone ?? 'text-foreground'}`}>{value}</span>
    </div>
  );
}
