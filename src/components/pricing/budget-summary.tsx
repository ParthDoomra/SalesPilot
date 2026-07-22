/**
 * BudgetSummary — compares the estimated cost against the customer's budget:
 * customer budget, estimated monthly/annual cost, difference, utilization %,
 * and a within/over-budget status. All values are estimates.
 */

"use client";

import * as React from 'react';
import { Wallet, CalendarClock, CalendarRange, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BudgetAnalysis } from '@/types';
import { formatMoney } from './format';

interface BudgetSummaryProps {
  analysis: BudgetAnalysis;
  currencySymbol: string;
}

export function BudgetSummary({ analysis, currencySymbol }: BudgetSummaryProps) {
  const {
    hasBudget,
    customerBudget,
    customerCurrencySymbol,
    budgetPeriod,
    estimatedMonthlyCost,
    estimatedAnnualCost,
    differenceMonthly,
    utilizationPercent,
    status,
  } = analysis;

  const isOver = status === 'over';
  const withinKnown = status !== 'unknown';

  const cards = [
    {
      label: 'Customer budget',
      value: hasBudget && customerBudget !== null
        ? `${customerCurrencySymbol}${customerBudget.toLocaleString()}`
        : '—',
      sub: hasBudget ? `per ${budgetPeriod}` : 'not provided',
      icon: Wallet,
      tone: 'text-foreground',
    },
    {
      label: 'Estimated monthly cost',
      value: formatMoney(estimatedMonthlyCost, currencySymbol),
      sub: 'AI estimate',
      icon: CalendarClock,
      tone: 'text-foreground',
    },
    {
      label: 'Estimated annual cost',
      value: formatMoney(estimatedAnnualCost, currencySymbol),
      sub: 'incl. annual commitment discount',
      icon: CalendarRange,
      tone: 'text-foreground',
    },
    {
      label: 'Budget difference',
      value: withinKnown && differenceMonthly !== null
        ? `${differenceMonthly >= 0 ? '+' : '−'}${formatMoney(Math.abs(differenceMonthly), currencySymbol)}`
        : '—',
      sub: withinKnown ? `${differenceMonthly !== null && differenceMonthly >= 0 ? 'under' : 'over'} / month` : 'no budget',
      icon: Scale,
      tone: withinKnown ? (isOver ? 'text-danger' : 'text-success') : 'text-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-3 font-display text-2xl font-semibold ${c.tone}`}>{c.value}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Utilization + status */}
      {withinKnown && utilizationPercent !== null && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Budget utilization</span>
            {isOver ? (
              <Badge variant="danger">
                <AlertTriangle className="h-3 w-3" /> Over Budget
              </Badge>
            ) : (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" /> Within Budget
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${Math.min(100, utilizationPercent)}%` }}
              />
            </div>
            <span className={`font-mono-data text-sm font-semibold ${isOver ? 'text-danger' : 'text-success'}`}>
              {utilizationPercent}%
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated monthly cost is {utilizationPercent}% of the customer&apos;s monthly budget.
          </p>
        </Card>
      )}
    </div>
  );
}
