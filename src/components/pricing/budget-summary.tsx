/**
 * BudgetSummary — compares the estimated cost against the customer's budget.
 * Internal amounts are USD; display converts via workspace currency selector.
 */

"use client";

import { Wallet, CalendarClock, CalendarRange, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BudgetAnalysis } from '@/types';
import { useCurrency } from '@/hooks/use-currency';

interface BudgetSummaryProps {
  analysis: BudgetAnalysis;
  /** Customer's original currency to display in. */
  currency?: string;
}

export function BudgetSummary({ analysis, currency }: BudgetSummaryProps) {
  const { formatFromUsd, format } = useCurrency();
  const {
    hasBudget,
    customerBudget,
    customerCurrency,
    budgetPeriod,
    budgetConversion,
    estimatedMonthlyCostUSD,
    estimatedAnnualCostUSD,
    differenceMonthlyUSD,
    utilizationPercent,
    status,
  } = analysis;

  // The customer's original currency (from the pricing conversion model).
  const displayCurrency = customerCurrency || currency || 'USD';
  const isOver = status === 'over';
  const withinKnown = status !== 'unknown';

  const cards = [
    {
      label: 'Customer budget',
      value:
        hasBudget && customerBudget !== null
          ? format(customerBudget, displayCurrency)
          : '—',
      sub: hasBudget ? `per ${budgetPeriod} (${displayCurrency})` : 'not provided',
      icon: Wallet,
      tone: 'text-foreground',
    },
    {
      label: 'Estimated monthly cost',
      value: formatFromUsd(estimatedMonthlyCostUSD, displayCurrency),
      sub: `AI estimate · priced in USD, shown in ${displayCurrency}`,
      icon: CalendarClock,
      tone: 'text-foreground',
    },
    {
      label: 'Estimated annual cost',
      value: formatFromUsd(estimatedAnnualCostUSD, displayCurrency),
      sub: 'incl. annual commitment discount',
      icon: CalendarRange,
      tone: 'text-foreground',
    },
    {
      label: 'Budget difference',
      value:
        withinKnown && differenceMonthlyUSD !== null
          ? `${differenceMonthlyUSD >= 0 ? '+' : '−'}${formatFromUsd(Math.abs(differenceMonthlyUSD), displayCurrency)}`
          : '—',
      sub: withinKnown
        ? `${differenceMonthlyUSD !== null && differenceMonthlyUSD >= 0 ? 'under' : 'over'} / month`
        : 'no budget',
      icon: Scale,
      tone: withinKnown ? (isOver ? 'text-danger' : 'text-success') : 'text-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      {budgetConversion && (
        <p className="text-[11px] text-muted-foreground">
          Budget converted to USD at rate 1 USD = {budgetConversion.exchangeRate}{' '}
          {customerCurrency} (as of {budgetConversion.exchangeRateTimestamp.slice(0, 10)}).
        </p>
      )}
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
            Estimated monthly cost is {utilizationPercent}% of the customer&apos;s monthly budget (USD comparison).
          </p>
        </Card>
      )}
    </div>
  );
}
