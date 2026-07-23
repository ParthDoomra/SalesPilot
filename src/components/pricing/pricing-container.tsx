/**
 * PricingContainer — Phase 4 view.
 *
 * Pricing is generated on demand (not auto-populated). The "Generate Pricing"
 * action reads the Phase 2 requirement + the selected Phase 3 architecture on
 * the server, combines them, and renders a full pricing report: budget
 * analysis, category & service breakdowns, alternatives, top cost drivers, an
 * AI explanation, and recommendations when over budget.
 */

"use client";

import * as React from 'react';
import { Loader2, Info, RefreshCw, Layout, Sparkles, Calculator } from 'lucide-react';
import { usePricing } from '@/hooks/use-pricing';
import { BudgetSummary } from './budget-summary';
import { CategoryBreakdown } from './category-breakdown';
import { ResourceCostTable } from './resource-cost-table';
import { AlternativesCompare } from './alternatives-compare';
import { CostExplanation } from './cost-explanation';

interface PricingContainerProps {
  projectId: string;
  onNavigateToNegotiation?: () => void;
}

export function PricingContainer({ projectId, onNavigateToNegotiation }: PricingContainerProps) {
  const {
    estimate,
    isLoading,
    error,
    hasGenerated,
    reason,
    hasArchitecture,
    activeOptionId,
    activeOption,
    setActiveOptionId,
    generate,
  } = usePricing(projectId);

  // Pricing is generated automatically from the selected architecture — the user
  // never has to pick an architecture here. As soon as a selected architecture
  // is available (this tab mounts after "Generate Pricing"), build the report.
  React.useEffect(() => {
    if (hasArchitecture && !hasGenerated && !isLoading) {
      generate();
    }
  }, [hasArchitecture, hasGenerated, isLoading, generate]);

  // No selected architecture in the persisted project state → prompt the user to
  // generate one in the Architecture tab first (also covers the server-side
  // 'no-architecture' reason).
  const noArchitecture = !hasArchitecture || (hasGenerated && !estimate && reason === 'no-architecture');

  // While a selected architecture exists but its report hasn't been built yet,
  // treat it as loading so the page never briefly shows a manual "generate" CTA.
  const autoPending = hasArchitecture && !hasGenerated;
  const showLoading = isLoading || autoPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border-subtle/50 pb-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">AI Cost Estimation</h3>
          <p className="text-xs text-muted-foreground">
            {estimate
              ? `Estimated ${estimate.provider} spend from the requirement + selected architecture.`
              : 'Generate a pricing report from the requirement and the selected architecture.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber/30 bg-amber-soft px-2.5 py-1 text-[11px] font-medium text-amber">
            Estimated Cost — not live pricing
          </span>
          {estimate && (
            <button
              onClick={generate}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-signal/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Loading (includes the automatic first-generation window) */}
      {showLoading && !noArchitecture && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface">
          <Loader2 className="h-8 w-8 animate-spin text-signal" />
          <span className="text-xs text-muted-foreground animate-pulse">
            Reading requirement + architecture and pricing resources…
          </span>
        </div>
      )}

      {/* No architecture — must generate one first */}
      {!showLoading && noArchitecture && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <Layout className="h-6 w-6" />
          </div>
          <h4 className="mt-4 font-display text-base font-semibold">No Architecture to Price</h4>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
            Generate and select a cloud architecture in the Architecture tab first, then generate the
            pricing report here.
          </p>
        </div>
      )}

      {/* Fallback call-to-action (e.g. after a manual reset) — the report normally auto-generates */}
      {!showLoading && !estimate && !noArchitecture && !error && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <Calculator className="h-6 w-6" />
          </div>
          <h4 className="mt-4 font-display text-base font-semibold">Generate a Pricing Report</h4>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            The AI Pricing Engine will read the customer requirement (budget, region, users,
            compliance…) and the selected architecture (provider, services, tier) to estimate cost
            and check it against the budget.
          </p>
          <button
            onClick={generate}
            className="mx-auto mt-5 flex items-center gap-1.5 rounded-lg bg-signal px-5 py-2.5 text-sm font-medium text-signal-foreground hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Generate Pricing
          </button>
        </div>
      )}

      {/* Report */}
      {estimate && activeOption && !isLoading && (() => {
        // Display everything in the customer's original currency. Internal
        // amounts are USD; conversion/formatting go through CurrencyService.
        const displayCurrency =
          estimate.currencyConversion?.originalCurrency ??
          activeOption.budgetAnalysis.customerCurrency ??
          estimate.currency;
        return (
        <div className="space-y-6">
          {/* Budget: customer budget, monthly/annual, difference, utilization, status */}
          <BudgetSummary analysis={activeOption.budgetAnalysis} currency={displayCurrency} onNavigateToNegotiation={onNavigateToNegotiation} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Cost breakdown by category */}
            <CategoryBreakdown categories={activeOption.categories} currency={displayCurrency} />
            {/* Compare alternatives */}
            <AlternativesCompare
              options={estimate.options}
              activeOptionId={activeOptionId}
              onSelect={setActiveOptionId}
              currency={displayCurrency}
            />
          </div>

          {/* AI explanation, top cost drivers, recommendations */}
          <CostExplanation option={activeOption} currency={displayCurrency} />

          {/* Cost breakdown by service */}
          <ResourceCostTable option={activeOption} currency={displayCurrency} />

          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border-subtle bg-surface-raised/40 px-4 py-3 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span>{estimate.disclaimer}</span>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
