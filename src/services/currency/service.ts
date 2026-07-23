/**
 * CurrencyService — the centralized entry point for exchange rates,
 * conversion, and money formatting across SalesPilot.
 *
 * Design goals (see task spec):
 *   1. Live rates from the Frankfurter Exchange Rate API (ECB data).
 *   2. `getExchangeRate` / `convertToUSD` / `convertFromUSD` / `formatCurrency`.
 *   3. Rates cached for 24 hours.
 *   4. If the API is unavailable, fall back to the last cached rates.
 *   5. If no cached rates exist either, throw a clear typed error (never crash).
 *   6. A single formatter covering USD, INR, EUR, GBP, AED, SGD, CAD, AUD, JPY.
 *
 * This module is intentionally self-contained and framework-agnostic: it works
 * on both the server and the client. It does NOT wire itself into any UI — the
 * exported `currencyService` singleton is meant to be consumed by hooks/route
 * handlers in a later integration step.
 *
 * NOTE: Frankfurter is backed by the ECB reference set, which does not include
 * AED. AED is a hard peg to USD (1 USD = 3.6725 AED), so it is supplied from a
 * documented pegged constant and merged into every rate table.
 */

import {
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  CODE_TO_LOCALE,
  SYMBOL_TO_CODE,
  INTERNAL_PRICING_CURRENCY,
  type SupportedCurrency,
} from './constants';
import { RateUnavailableError, UnsupportedCurrencyError } from './errors';

/** Base URL for the Frankfurter API (https://frankfurter.dev). */
const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v1';

/** Rates are cached for 24 hours (requirement #3). */
export const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Network timeout for a live rate fetch. */
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Currencies not covered by Frankfurter's ECB dataset, with their fixed USD
 * peg (units of currency per 1 USD). These are merged into the live table.
 */
const PEGGED_USD_RATES: Readonly<Record<string, number>> = {
  AED: 3.6725, // UAE dirham — pegged to USD since 1997.
};

/** Codes we actually request from Frankfurter (supported minus USD minus pegged). */
const FRANKFURTER_SYMBOLS: readonly string[] = SUPPORTED_CURRENCIES.filter(
  (code) => code !== INTERNAL_PRICING_CURRENCY && !(code in PEGGED_USD_RATES),
);

/** A rate table: units of each currency per 1 USD. */
export type RateTable = Record<string, number>;

/** A cached rate snapshot with provenance for diagnostics/UI badges. */
export interface RateSnapshot {
  /** USD-based rate table (units per 1 USD). */
  rates: RateTable;
  /** Epoch ms when the rates were fetched. */
  fetchedAt: number;
  /** ISO date the provider reported the rates for. */
  ratesDate: string | null;
  /** Where the rates came from. */
  source: 'live' | 'cache';
}

interface FrankfurterLatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

function normalizeCode(input: string): string {
  const trimmed = input.trim();
  return SYMBOL_TO_CODE[trimmed] ?? trimmed.toUpperCase();
}

/**
 * The CurrencyService class. A single shared instance is exported as
 * `currencyService`; the class is exported for isolated testing.
 */
export class CurrencyService {
  private cache: RateSnapshot | null = null;
  /** De-dupes concurrent refreshes so we hit the API at most once at a time. */
  private inflight: Promise<RateSnapshot> | null = null;

  // --- Public API ---------------------------------------------------------

  /** The currencies this service supports. */
  getSupportedCurrencies(): readonly SupportedCurrency[] {
    return SUPPORTED_CURRENCIES;
  }

  isSupportedCurrency(code: string): code is SupportedCurrency {
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(normalizeCode(code));
  }

  /**
   * Exchange rate to convert 1 unit of `from` into `to`.
   *
   * @throws {UnsupportedCurrencyError} if either code is not supported.
   * @throws {RateUnavailableError} if rates can't be fetched and none are cached.
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    const fromCode = this.assertSupported(from);
    const toCode = this.assertSupported(to);
    if (fromCode === toCode) return 1;

    const { rates } = await this.getRates();
    const fromPerUsd = rates[fromCode];
    const toPerUsd = rates[toCode];

    // Both codes are supported, so a missing entry means the snapshot is
    // incomplete — treat it as "no usable rate" rather than returning NaN.
    if (!(fromPerUsd > 0) || !(toPerUsd > 0)) {
      throw new RateUnavailableError(fromCode, toCode);
    }

    // rates are "units per USD": USD->to is `toPerUsd`, from->USD is `1/fromPerUsd`.
    return toPerUsd / fromPerUsd;
  }

  /** Convert an amount in `currency` into USD. */
  async convertToUSD(amount: number, currency: string): Promise<number> {
    const rate = await this.getExchangeRate(currency, INTERNAL_PRICING_CURRENCY);
    return amount * rate;
  }

  /** Convert a USD amount into `currency`. */
  async convertFromUSD(amount: number, currency: string): Promise<number> {
    const rate = await this.getExchangeRate(INTERNAL_PRICING_CURRENCY, currency);
    return amount * rate;
  }

  /**
   * Format an amount that is ALREADY in `currency` (no conversion is done here).
   * Single formatter for all supported currencies (requirement #6). Uses
   * `Intl.NumberFormat` with a currency-appropriate locale so grouping and
   * symbol placement are correct (e.g. Indian lakh grouping for INR).
   *
   * @throws {UnsupportedCurrencyError} if the code is not supported.
   */
  formatCurrency(
    amount: number,
    currency: string = INTERNAL_PRICING_CURRENCY,
    options?: Intl.NumberFormatOptions,
  ): string {
    const code = this.assertSupported(currency);
    const locale = CODE_TO_LOCALE[code] ?? 'en-US';
    // JPY has no minor unit; everything else defaults to whole-number display
    // here (the app treats estimates as rounded figures) but callers can
    // override via `options`.
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
        ...options,
      }).format(amount);
    } catch {
      // Extremely defensive: if the runtime lacks the currency/locale data,
      // fall back to "<symbol><grouped number>".
      const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
    }
  }

  // --- Cache management (useful for tests / warmup) ------------------------

  /** Current cached snapshot, if any (does not trigger a fetch). */
  peekCache(): RateSnapshot | null {
    return this.cache;
  }

  /** Force the next call to re-fetch from the provider. */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Ensure rates are loaded and fresh, returning the snapshot. Safe to call
   * eagerly (e.g. on app boot) to warm the cache.
   */
  async warm(): Promise<RateSnapshot> {
    return this.getRates();
  }

  /**
   * Async: guarantee the 24h cache is populated before synchronous conversions
   * are used. Callers that need to perform many conversions in a synchronous
   * pass (e.g. the offline Pricing Engine) should `await` this first — it runs
   * the full fetch → cache → stale-cache → error flow exactly once. Alias of
   * {@link warm}, named for intent at the call site.
   */
  async ensureRatesLoaded(): Promise<RateSnapshot> {
    return this.getRates();
  }

  // --- Synchronous, cache-backed conversion -------------------------------
  //
  // These read ONLY the in-memory 24h cache and never touch the network, so
  // they can be used inside synchronous code paths. Call `ensureRatesLoaded()`
  // (async) once beforehand to populate the cache. If no rates are cached they
  // throw RateUnavailableError — a clear, catchable error rather than a crash.

  /** Synchronous exchange rate (1 unit of `from` -> `to`) from the cache. */
  getExchangeRateSync(from: string, to: string): number {
    const fromCode = this.assertSupported(from);
    const toCode = this.assertSupported(to);
    if (fromCode === toCode) return 1;

    const rates = this.requireCachedRates();
    const fromPerUsd = rates[fromCode];
    const toPerUsd = rates[toCode];
    if (!(fromPerUsd > 0) || !(toPerUsd > 0)) {
      throw new RateUnavailableError(fromCode, toCode);
    }
    return toPerUsd / fromPerUsd;
  }

  /** Synchronous: convert an amount in `currency` into USD from the cache. */
  convertToUSDSync(amount: number, currency: string): number {
    return amount * this.getExchangeRateSync(currency, INTERNAL_PRICING_CURRENCY);
  }

  /** Synchronous: convert a USD amount into `currency` from the cache. */
  convertFromUSDSync(amount: number, currency: string): number {
    return amount * this.getExchangeRateSync(INTERNAL_PRICING_CURRENCY, currency);
  }

  /**
   * Synchronous budget conversion helper for the Pricing Engine. Converts an
   * amount in `currency` to USD and returns the figures needed to persist the
   * conversion on a pricing report.
   *
   * @returns exchangeRate as "units of `currency` per 1 USD" (matches the
   *   "1 USD = X" convention shown in the UI), plus the provider's rate date.
   */
  convertBudgetToUSDSync(
    amount: number,
    currency: string,
  ): {
    usdAmount: number;
    exchangeRate: number;
    exchangeRateDate: string | null;
    source: RateSnapshot['source'];
  } {
    const code = this.assertSupported(currency);
    const usdAmount = this.convertToUSDSync(amount, code);
    // "foreign per USD" — used both for storage and the UI's "1 USD = X" label.
    const exchangeRate = this.getExchangeRateSync(INTERNAL_PRICING_CURRENCY, code);
    // requireCachedRates() inside the calls above guarantees the cache exists.
    const snapshot = this.cache as RateSnapshot;
    return {
      usdAmount,
      exchangeRate,
      exchangeRateDate: snapshot.ratesDate,
      source: snapshot.source,
    };
  }

  // --- Internals ----------------------------------------------------------

  /** Cached rate table, or a clear error if nothing has been fetched yet. */
  private requireCachedRates(): RateTable {
    if (!this.cache) {
      // Requirement: no cached rate -> meaningful error, never a crash.
      throw new RateUnavailableError(INTERNAL_PRICING_CURRENCY, '*');
    }
    return this.cache.rates;
  }

  private assertSupported(code: string): SupportedCurrency {
    const normalized = normalizeCode(code);
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(normalized)) {
      throw new UnsupportedCurrencyError(code);
    }
    return normalized as SupportedCurrency;
  }

  /**
   * Return a fresh rate snapshot, applying the cache/fallback rules:
   *   - fresh cache (< 24h) -> return it, no network call;
   *   - otherwise fetch live; on success cache + return;
   *   - on failure fall back to stale cache if present;
   *   - if there is no cache at all, throw RateUnavailableError.
   */
  private async getRates(): Promise<RateSnapshot> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < RATE_CACHE_TTL_MS) {
      return this.cache;
    }
    if (this.inflight) return this.inflight;

    this.inflight = (async () => {
      try {
        const snapshot = await this.fetchLiveRates();
        this.cache = snapshot;
        return snapshot;
      } catch (err) {
        // Requirement #4: API down -> use the last cached rates (even if stale).
        if (this.cache) {
          return { ...this.cache, source: 'cache' as const };
        }
        // Requirement #5: nothing cached -> clear, typed error (no crash).
        throw new RateUnavailableError(
          INTERNAL_PRICING_CURRENCY,
          '*',
          err,
        );
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  /** One live call to Frankfurter, merged with pegged rates. */
  private async fetchLiveRates(): Promise<RateSnapshot> {
    const url =
      `${FRANKFURTER_BASE_URL}/latest` +
      `?base=${INTERNAL_PRICING_CURRENCY}` +
      `&symbols=${FRANKFURTER_SYMBOLS.join(',')}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Frankfurter API responded with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Partial<FrankfurterLatestResponse>;
    if (!data || typeof data.rates !== 'object' || data.rates === null) {
      throw new Error('Malformed response from Frankfurter API');
    }

    const rates: RateTable = { [INTERNAL_PRICING_CURRENCY]: 1, ...PEGGED_USD_RATES };
    for (const [code, value] of Object.entries(data.rates)) {
      if (typeof value === 'number' && value > 0) rates[code] = value;
    }

    return {
      rates,
      fetchedAt: Date.now(),
      ratesDate: typeof data.date === 'string' ? data.date : null,
      source: 'live',
    };
  }
}

/** Shared singleton — import this everywhere. */
export const currencyService = new CurrencyService();
