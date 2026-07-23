"use client";

/**
 * useProjectCurrency — resolves a project's customer/original display currency
 * and bundles the centralized CurrencyService formatters. Amounts are stored in
 * USD and converted to the customer's original currency for display.
 */

import { useProjectsStore } from '@/lib/projects-store';
import { useProjectPricingStore } from '@/lib/project-pricing-store';
import { resolveProjectCurrency } from '@/lib/project-currency';
import { useCurrency } from '@/hooks/use-currency';

export function useProjectCurrency(projectId?: string) {
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const pricingEstimate = useProjectPricingStore((s) =>
    projectId ? s.byProject[projectId] ?? null : null,
  );
  const { code, symbol, monthlyEstimateUsd } = resolveProjectCurrency(project, { pricingEstimate });
  const currency = useCurrency();

  return {
    /** Customer's original currency code (e.g. "INR"). */
    currency: code,
    currencyCode: code,
    currencySymbol: symbol,
    monthlyEstimateUsd,
    ...currency,
  };
}
