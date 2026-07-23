/**
 * Project pricing sync — stores canonical USD estimates on the project document.
 * Display currency conversion happens in the UI via useMoneyDisplay().
 */

import type { Project } from '@/lib/types';
import type { PricingEstimate } from '@/types';
import type { RequirementModel } from '@/types/requirement';
import { useProjectsStore } from '@/lib/projects-store';
import { useProjectPricingStore } from '@/lib/project-pricing-store';
import { INTERNAL_PRICING_CURRENCY } from '@/services/currency/constants';
import { convertBudgetToUsd, getCurrencySymbol } from '@/services/currency';

/** The customer's original (display) currency for a project's estimate. */
function originalCurrencyOf(
  project: Project | null | undefined,
  pricingEstimate?: PricingEstimate | null,
): string {
  return (
    pricingEstimate?.currencyConversion?.originalCurrency ??
    project?.estimateCurrency ??
    INTERNAL_PRICING_CURRENCY
  );
}

/** Resolve the USD monthly estimate for a project. */
export function getProjectMonthlyUsd(
  project: Project | null | undefined,
  pricingEstimate?: PricingEstimate | null,
): number {
  if (project?.monthlyEstimateUsd != null && project.monthlyEstimateUsd > 0) {
    return project.monthlyEstimateUsd;
  }
  if (pricingEstimate) {
    const opt =
      pricingEstimate.options.find((o) => o.optionId === pricingEstimate.selectedOptionId) ??
      pricingEstimate.options[0];
    if (opt) return Math.round(opt.monthlyCost);
  }
  // Legacy: treat stored monthlyEstimate as USD if monthlyEstimateUsd absent.
  return project?.monthlyEstimate ?? 0;
}

/** Writes USD pricing-report values onto the project document. */
export function syncProjectFromPricingEstimate(projectId: string, estimate: PricingEstimate): void {
  const activeOption =
    estimate.options.find((o) => o.optionId === estimate.selectedOptionId) ?? estimate.options[0];
  if (!activeOption) return;

  const roundedUsd = Math.round(activeOption.monthlyCost);
  const displayCurrency = originalCurrencyOf(
    useProjectsStore.getState().projects.find((p) => p.id === projectId),
    estimate,
  );
  const current = useProjectsStore.getState().projects.find((p) => p.id === projectId);
  if (
    current &&
    current.monthlyEstimateUsd === roundedUsd &&
    current.estimateCurrency === displayCurrency
  ) {
    return;
  }

  // monthlyEstimate stays in USD (canonical); estimateCurrency records the
  // customer's original currency so the UI can display it converted.
  useProjectsStore.getState().updateProject(projectId, {
    monthlyEstimateUsd: roundedUsd,
    monthlyEstimate: roundedUsd,
    estimateCurrency: displayCurrency,
    estimateCurrencySymbol: getCurrencySymbol(displayCurrency),
  });
}

/** Resolve the display currency and monthly estimate for a project. */
export function resolveProjectCurrency(
  project: Project | null | undefined,
  options?: { pricingEstimate?: PricingEstimate | null },
): { code: string; symbol: string; monthlyEstimateUsd: number } {
  const monthlyEstimateUsd = getProjectMonthlyUsd(project, options?.pricingEstimate);
  const code = originalCurrencyOf(project, options?.pricingEstimate);
  return {
    code,
    symbol: getCurrencySymbol(code),
    monthlyEstimateUsd,
  };
}

/** Sync project details from a requirement budget snapshot. */
export function syncProjectFromRequirement(projectId: string, requirement: RequirementModel | null | undefined): void {
  const budgetValue = requirement?.budget?.value;
  if (typeof budgetValue !== 'number' || budgetValue <= 0) return;

  const budgetCurrency = (requirement?.budgetCurrency?.value as string | null | undefined) ?? INTERNAL_PRICING_CURRENCY;
  const budgetPeriod = (requirement?.budgetPeriod?.value as string | null | undefined) ?? 'monthly';
  const conversion = convertBudgetToUsd(budgetValue, budgetCurrency, budgetPeriod);
  const roundedUsd = Math.round(conversion.convertedBudgetUSD);
  const current = useProjectsStore.getState().projects.find((p) => p.id === projectId);
  if (current && current.monthlyEstimateUsd === roundedUsd && current.estimateCurrency === budgetCurrency) {
    return;
  }

  useProjectsStore.getState().updateProject(projectId, {
    monthlyEstimateUsd: roundedUsd,
    monthlyEstimate: roundedUsd,
    estimateCurrency: budgetCurrency,
    estimateCurrencySymbol: getCurrencySymbol(budgetCurrency),
  });
}

/** Backfill project USD estimates from persisted pricing reports. */
export function syncAllProjectsFromPricingStore(): void {
  const byProject = useProjectPricingStore.getState().byProject;
  for (const [projectId, estimate] of Object.entries(byProject)) {
    syncProjectFromPricingEstimate(projectId, estimate);
  }
}
