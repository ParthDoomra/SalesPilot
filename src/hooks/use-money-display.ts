"use client";

import * as React from 'react';
import {
  convertFromUSD,
  formatCurrency,
  formatUsdForDisplay,
  formatCostRangeForDisplay,
  type ExchangeRateSnapshot,
} from '@/services/currency';
import { fetchLiveRates } from '@/services/currency/rate-cache';
import { useDisplayCurrencyStore } from '@/lib/display-currency-store';

/** Loads exchange rates once and exposes USD → display-currency helpers. */
export function useMoneyDisplay() {
  const displayCurrency = useDisplayCurrencyStore((s) => s.currency);
  const setDisplayCurrency = useDisplayCurrencyStore((s) => s.setCurrency);
  const [ratesSnapshot, setRatesSnapshot] = React.useState<ExchangeRateSnapshot | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchLiveRates().then((snap) => {
      if (!cancelled) setRatesSnapshot(snap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rates = ratesSnapshot?.rates;

  const convertUsd = React.useCallback(
    (amountUsd: number) => convertFromUSD(amountUsd, displayCurrency, rates),
    [displayCurrency, rates],
  );

  const formatUsd = React.useCallback(
    (amountUsd: number, options?: Intl.NumberFormatOptions) =>
      formatUsdForDisplay(amountUsd, displayCurrency, rates, options),
    [displayCurrency, rates],
  );

  const formatDisplay = React.useCallback(
    (amount: number, options?: Intl.NumberFormatOptions) =>
      formatCurrency(amount, displayCurrency, options),
    [displayCurrency],
  );

  const formatRange = React.useCallback(
    (range: string) => formatCostRangeForDisplay(range, displayCurrency, rates),
    [displayCurrency, rates],
  );

  return {
    displayCurrency,
    currency: displayCurrency,
    setDisplayCurrency,
    rates,
    ratesReady: !!ratesSnapshot,
    ratesSnapshot,
    convertUsd,
    formatUsd,
    formatDisplay,
    formatRange,
  };
}
