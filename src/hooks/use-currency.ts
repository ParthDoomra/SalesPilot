"use client";

/**
 * useCurrency — the single UI entry point to the centralized CurrencyService.
 *
 * Loads the 24h-cached exchange rates once per session, then exposes
 * synchronous format/convert helpers so components can render money without
 * dealing with async rate loading. Everything routes through CurrencyService:
 *   • format          — format a value already in `currency`.
 *   • formatFromUsd   — convert a USD (internal) amount to `currency` and format.
 *   • formatRangeFromUsd — convert + format a USD cost-range string.
 *
 * Amounts are stored internally in USD; conversion happens only at display
 * time. When rates aren't loaded yet (or a currency is unsupported), the USD
 * figure is shown as a safe fallback rather than crashing.
 */

import * as React from 'react';
import { currencyService } from '@/services/currency';

const INTERNAL = 'USD';

// Shared across every hook instance so rates are fetched at most once.
let ratesPromise: Promise<unknown> | null = null;
function loadRatesOnce(): Promise<unknown> {
  if (!ratesPromise) {
    ratesPromise = currencyService.ensureRatesLoaded().catch(() => null);
  }
  return ratesPromise;
}

export interface UseCurrencyResult {
  /** True once the exchange-rate load has settled (success or failure). */
  ready: boolean;
  /** Format a value already denominated in `currency` (no conversion). */
  format: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  /** Convert a USD amount into `currency` (numeric). Returns the USD amount on failure. */
  convertFromUsd: (amountUsd: number, currency?: string) => number;
  /** Convert a USD amount into `currency` and format it. */
  formatFromUsd: (amountUsd: number, currency?: string) => string;
  /** Convert + format a USD cost-range string, e.g. "$400 - $800 / mo". */
  formatRangeFromUsd: (range: string, currency?: string) => string;
}

export function useCurrency(): UseCurrencyResult {
  const [ready, setReady] = React.useState<boolean>(() => currencyService.peekCache() !== null);

  React.useEffect(() => {
    let active = true;
    loadRatesOnce().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const format = React.useCallback(
    (amount: number, currency: string = INTERNAL, options?: Intl.NumberFormatOptions) => {
      try {
        return currencyService.formatCurrency(amount, currency, options);
      } catch {
        return currencyService.formatCurrency(Math.round(amount), INTERNAL, options);
      }
    },
    [],
  );

  const convertFromUsd = React.useCallback(
    (amountUsd: number, currency: string = INTERNAL) => {
      const code = (currency || INTERNAL).toUpperCase();
      if (code === INTERNAL) return amountUsd;
      try {
        return currencyService.convertFromUSDSync(amountUsd, code);
      } catch {
        return amountUsd;
      }
    },
    // `ready` so callers recompute once rates finish loading.
    [ready],
  );

  const formatFromUsd = React.useCallback(
    (amountUsd: number, currency: string = INTERNAL) => {
      const code = (currency || INTERNAL).toUpperCase();
      if (code === INTERNAL) return format(amountUsd, INTERNAL);
      try {
        const converted = currencyService.convertFromUSDSync(amountUsd, code);
        return currencyService.formatCurrency(converted, code);
      } catch {
        // Rates not loaded yet or currency unsupported — show the USD figure.
        return format(amountUsd, INTERNAL);
      }
    },
    // `ready` is a dependency so callers recompute once rates finish loading.
    [format, ready],
  );

  const formatRangeFromUsd = React.useCallback(
    (range: string, currency: string = INTERNAL) => {
      if (!range) return range;
      const numbers = (range.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) =>
        parseFloat(n.replace(/,/g, '')),
      );
      if (numbers.length === 0) return range;
      const suffixMatch = range.match(/(\s*\/.*)$/);
      const suffix = suffixMatch ? suffixMatch[1] : '';
      if (numbers.length === 1) return `${formatFromUsd(numbers[0], currency)}${suffix}`;
      const lo = Math.min(...numbers);
      const hi = Math.max(...numbers);
      return `${formatFromUsd(lo, currency)} - ${formatFromUsd(hi, currency)}${suffix}`;
    },
    [formatFromUsd],
  );

  return { ready, format, convertFromUsd, formatFromUsd, formatRangeFromUsd };
}
