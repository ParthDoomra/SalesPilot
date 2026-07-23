/** Shared money formatting — converts USD internal amounts for display. */

import { formatUsdForDisplay } from '@/services/currency';

/** Format a USD amount in the selected display currency. */
export function formatMoneyUsd(
  amountUsd: number,
  displayCurrency: string,
  rates?: Record<string, number>,
): string {
  return formatUsdForDisplay(amountUsd, displayCurrency, rates);
}

/** Compatibility helper for legacy pricing UI imports. */
export function formatMoney(
  amountUsd: number,
  displayCurrency: string,
  rates?: Record<string, number>,
): string {
  return formatMoneyUsd(amountUsd, displayCurrency, rates);
}

/** Colour class for a confidence score, matching the app's semantic tokens. */
export function confidenceTone(confidence: number): string {
  if (confidence >= 85) return 'text-success';
  if (confidence >= 70) return 'text-signal';
  return 'text-amber';
}
