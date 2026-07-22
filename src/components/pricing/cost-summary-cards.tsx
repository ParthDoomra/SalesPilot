/**
 * CostSummaryCards — top-line estimated monthly / yearly totals, blended
 * confidence, and resource count for the active architecture option.
 */

"use client";

import * as React from 'react';
import { CalendarClock, CalendarRange, Gauge, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { OptionCostEstimate } from '@/types';
import { formatMoney, confidenceTone } from './format';

interface CostSummaryCardsProps {
  option: OptionCostEstimate;
  currencySymbol: string;
}

export function CostSummaryCards({ option, currencySymbol }: CostSummaryCardsProps) {
  const stats = [
    {
      label: 'Estimated monthly cost',
      value: formatMoney(option.monthlyCost, currencySymbol),
      sub: `${option.optionName}`,
      icon: CalendarClock,
      tone: 'text-foreground',
    },
    {
      label: 'Estimated yearly cost',
      value: formatMoney(option.yearlyCost, currencySymbol),
      sub: 'includes annual commitment discount',
      icon: CalendarRange,
      tone: 'text-foreground',
    },
    {
      label: 'Estimate confidence',
      value: `${option.confidence}%`,
      sub: 'cost-weighted across resources',
      icon: Gauge,
      tone: confidenceTone(option.confidence),
    },
    {
      label: 'Resources priced',
      value: option.resources.length.toString(),
      sub: `${option.categories.length} categories`,
      icon: Layers,
      tone: 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
              <s.icon className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-3 font-display text-2xl font-semibold ${s.tone}`}>{s.value}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{s.sub}</div>
        </Card>
      ))}
    </div>
  );
}
