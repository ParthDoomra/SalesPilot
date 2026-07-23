import { FALLBACK_RATES } from './fallback-rates';
import {
  INTERNAL_PRICING_CURRENCY,
  CURRENCY_SYMBOLS,
  CODE_TO_LOCALE,
  SYMBOL_TO_CODE,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from './constants';
import { FALLBACK_RATES as FALLBACK } from './fallback-rates';

export type ExchangeRateSnapshot = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
  source: 'live' | 'cache' | 'fallback';
};

export type BudgetConversionResult = {
  originalBudget: number;
  originalCurrency: string;
  convertedBudgetUSD: number;
  exchangeRate: number;
  exchangeRateTimestamp: string;
};

function normalizeCode(code: string): string {
  const trimmed = code.trim();
  if (SYMBOL_TO_CODE[trimmed]) return SYMBOL_TO_CODE[trimmed];
  return trimmed.toUpperCase();
}

function resolveRate(code: string, rates?: Record<string, number>): number {
  const upper = normalizeCode(code);
  const table = rates ?? FALLBACK;
  return table[upper] ?? FALLBACK[upper] ?? 1;
}

/** Units of foreign currency per 1 USD. */
export function getExchangeRate(currencyCode: string, rates?: Record<string, number>): number {
  const upper = normalizeCode(currencyCode);
  if (upper === INTERNAL_PRICING_CURRENCY) return 1;
  return resolveRate(upper, rates);
}

/** Convert an amount in any currency to USD. */
export function convertToUSD(
  amount: number,
  fromCurrency: string,
  rates?: Record<string, number>,
): number {
  const upper = normalizeCode(fromCurrency);
  if (upper === INTERNAL_PRICING_CURRENCY) return amount;
  const rate = getExchangeRate(upper, rates);
  if (rate <= 0) return amount;
  return amount / rate;
}

/** Convert a USD amount into the target display currency. */
export function convertFromUSD(
  amountUsd: number,
  toCurrency: string,
  rates?: Record<string, number>,
): number {
  const upper = normalizeCode(toCurrency);
  if (upper === INTERNAL_PRICING_CURRENCY) return amountUsd;
  return amountUsd * getExchangeRate(upper, rates);
}

export function getCurrencySymbol(code: string): string {
  const upper = normalizeCode(code);
  return CURRENCY_SYMBOLS[upper] ?? `${upper} `;
}

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(normalizeCode(code));
}

/**
 * Format a monetary amount using Intl.NumberFormat.
 * Amount should already be in the target currency (post-conversion for display).
 */
export function formatCurrency(
  amount: number,
  currencyCodeOrSymbol: string = INTERNAL_PRICING_CURRENCY,
  options?: Intl.NumberFormatOptions,
): string {
  let code = currencyCodeOrSymbol.trim();

  if (SYMBOL_TO_CODE[code]) {
    code = SYMBOL_TO_CODE[code];
  } else {
    const upper = code.toUpperCase();
    if (CODE_TO_LOCALE[upper]) {
      code = upper;
    } else {
      const entry = Object.entries(CURRENCY_SYMBOLS).find(([, sym]) => sym === currencyCodeOrSymbol);
      if (entry) {
        code = entry[0];
      } else {
        const formattedNumber = Math.round(amount).toLocaleString('en-US');
        return currencyCodeOrSymbol.length > 3
          ? `${formattedNumber} ${currencyCodeOrSymbol}`
          : `${currencyCodeOrSymbol}${formattedNumber}`;
      }
    }
  }

  const locale = CODE_TO_LOCALE[code] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    const formattedNumber = Math.round(amount).toLocaleString(locale);
    const symbol = CURRENCY_SYMBOLS[code] ?? currencyCodeOrSymbol;
    return `${symbol}${formattedNumber}`;
  }
}

/** Format a USD internal amount in the selected display currency. */
export function formatUsdForDisplay(
  amountUsd: number,
  displayCurrency: string,
  rates?: Record<string, number>,
  options?: Intl.NumberFormatOptions,
): string {
  const converted = convertFromUSD(amountUsd, displayCurrency, rates);
  return formatCurrency(converted, displayCurrency, options);
}

/** Convert customer budget (any currency / period) to monthly USD for pricing comparison. */
export function convertBudgetToUsd(
  amount: number,
  currency: string,
  period: string,
  rates?: Record<string, number>,
  timestamp?: string,
): BudgetConversionResult {
  const upper = normalizeCode(currency);
  const monthlyOriginal =
    period === 'yearly' || period === 'one-time' ? amount / 12 : amount;
  const exchangeRate = getExchangeRate(upper, rates);
  const convertedBudgetUSD = convertToUSD(monthlyOriginal, upper, rates);

  return {
    originalBudget: amount,
    originalCurrency: upper,
    convertedBudgetUSD,
    exchangeRate,
    exchangeRateTimestamp: timestamp ?? new Date().toISOString(),
  };
}

/**
 * Parse an architecture cost range string into a USD midpoint.
 * Handles USD-native strings and foreign-currency strings (₹, EUR, etc.).
 */
export function parseCostRangeToUsd(range?: string, rates?: Record<string, number>): number | null {
  if (!range) return null;

  const numbers = (range.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) =>
    parseFloat(n.replace(/,/g, '')),
  );
  if (numbers.length === 0) return null;

  const mid = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const isInr = /₹|inr|rs\.?/i.test(range);
  const isEur = /€|eur/i.test(range);
  const isGbp = /£|gbp/i.test(range);
  const isJpy = /¥|jpy/i.test(range);

  let usd = mid;
  if (isInr) usd = convertToUSD(mid, 'INR', rates);
  else if (isEur) usd = convertToUSD(mid, 'EUR', rates);
  else if (isGbp) usd = convertToUSD(mid, 'GBP', rates);
  else if (isJpy) usd = convertToUSD(mid, 'JPY', rates);

  return Number.isFinite(usd) && usd > 0 ? usd : null;
}

/** Format a USD range as a display-currency range string (e.g. for architecture cards). */
export function formatUsdRangeForDisplay(
  usdLow: number,
  usdHigh: number,
  displayCurrency: string,
  rates?: Record<string, number>,
  suffix = ' / mo',
): string {
  const low = convertFromUSD(usdLow, displayCurrency, rates);
  const high = convertFromUSD(usdHigh, displayCurrency, rates);
  return `${formatCurrency(low, displayCurrency)} - ${formatCurrency(high, displayCurrency)}${suffix}`;
}

/** Parse a range string, convert USD bounds to display currency. */
export function formatCostRangeForDisplay(
  range: string,
  displayCurrency: string,
  rates?: Record<string, number>,
): string {
  const numbers = (range.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) =>
    parseFloat(n.replace(/,/g, '')),
  );
  if (numbers.length === 0) return range;

  const isForeign = /₹|inr|€|eur|£|gbp|¥|jpy|rs\.?/i.test(range);
  let usdValues: number[];

  if (isForeign) {
    usdValues = numbers.map((n) => {
      const isInr = /₹|inr|rs\.?/i.test(range);
      const isEur = /€|eur/i.test(range);
      const isGbp = /£|gbp/i.test(range);
      const isJpy = /¥|jpy/i.test(range);
      if (isInr) return convertToUSD(n, 'INR', rates);
      if (isEur) return convertToUSD(n, 'EUR', rates);
      if (isGbp) return convertToUSD(n, 'GBP', rates);
      if (isJpy) return convertToUSD(n, 'JPY', rates);
      return n;
    });
  } else {
    usdValues = numbers;
  }

  const suffixMatch = range.match(/(\s*\/.*)$/);
  const suffix = suffixMatch ? suffixMatch[1] : '';

  if (usdValues.length === 1) {
    return `${formatUsdForDisplay(usdValues[0], displayCurrency, rates)}${suffix}`;
  }

  return formatUsdRangeForDisplay(
    Math.min(...usdValues),
    Math.max(...usdValues),
    displayCurrency,
    rates,
    suffix,
  );
}
