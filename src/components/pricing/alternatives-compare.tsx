/**
 * AlternativesCompare — compares estimated monthly cost across the generated
 * architecture alternatives (Performance / Balanced / Budget) and lets the user
 * switch which alternative the pricing view is inspecting.
 */

"use client";

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OptionCostEstimate } from '@/types';
import { confidenceTone } from './format';
import { useCurrency } from '@/hooks/use-currency';

const TYPE_LABEL: Record<OptionCostEstimate['optionType'], string> = {
  performance: 'Performance',
  balanced: 'Balanced',
  budget: 'Budget',
};

interface AlternativesCompareProps {
  options: OptionCostEstimate[];
  activeOptionId: string | null;
  onSelect: (id: string) => void;
  /** Customer's original currency to display in. */
  currency: string;
}

export function AlternativesCompare({
  options,
  activeOptionId,
  onSelect,
  currency,
}: AlternativesCompareProps) {
  const { formatFromUsd, format, convertFromUsd } = useCurrency();
  const ordered = [...options].sort((a, b) => {
    const order = { balanced: 0, performance: 1, budget: 2 };
    return order[a.optionType] - order[b.optionType];
  });

  const cheapestId = options.reduce(
    (min, o) => (o.monthlyCost < min.monthlyCost ? o : min),
    options[0],
  )?.optionId;

  const chartData = ordered.map((o) => ({
    name: TYPE_LABEL[o.optionType],
    id: o.optionId,
    monthly: o.monthlyCost,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare alternatives</CardTitle>
        <CardDescription>Estimated monthly cost across generated architecture options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${format(convertFromUsd(Number(v), currency) / 1000, currency, { maximumFractionDigits: 1 })}k`}
                width={54}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-raised)', opacity: 0.4 }}
                contentStyle={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [
                  `${formatFromUsd(Number(Array.isArray(value) ? value[0] : value ?? 0), currency)} / mo`,
                  'Estimated cost',
                ]}
              />
              <Bar dataKey="monthly" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.id === activeOptionId ? 'var(--color-signal)' : 'var(--color-border-default)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Selectable option summaries */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {ordered.map((o) => {
            const isActive = o.optionId === activeOptionId;
            return (
              <button
                key={o.optionId}
                onClick={() => onSelect(o.optionId)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isActive
                    ? 'border-signal bg-signal-soft/10 shadow-sm'
                    : 'border-border-subtle bg-surface/50 hover:border-border-default'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{TYPE_LABEL[o.optionType]}</span>
                  {o.optionId === cheapestId && <Badge variant="success">Lowest est.</Badge>}
                </div>
                <div className="mt-2 font-mono-data text-base font-semibold text-foreground">
                  {formatFromUsd(o.monthlyCost, currency)}
                  <span className="text-[10px] font-normal text-muted-foreground"> /mo est.</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatFromUsd(o.yearlyCost, currency)}/yr ·{' '}
                  <span className={confidenceTone(o.confidence)}>{o.confidence}% confidence</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
