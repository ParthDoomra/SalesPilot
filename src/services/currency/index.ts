export {
  SUPPORTED_CURRENCIES,
  INTERNAL_PRICING_CURRENCY,
  CURRENCY_SYMBOLS,
  CODE_TO_LOCALE,
  SYMBOL_TO_CODE,
  RATE_CACHE_TTL_MS,
  RATE_CACHE_STORAGE_KEY,
  type SupportedCurrency,
} from './constants';

export { FALLBACK_RATES } from './fallback-rates';

export {
  convertToUSD,
  convertFromUSD,
  convertBudgetToUsd,
  formatCurrency,
  formatUsdForDisplay,
  formatCostRangeForDisplay,
  formatUsdRangeForDisplay,
  getCurrencySymbol,
  getExchangeRate,
  isSupportedCurrency,
  parseCostRangeToUsd,
  type BudgetConversionResult,
  type ExchangeRateSnapshot,
} from './currency-service';

export { fetchLiveRates, fetchRatesFromProvider, loadCachedRates, saveCachedRates } from './rate-cache';

/**
 * Centralized CurrencyService (Frankfurter-backed, 24h cache, async API).
 * This is the canonical entry point for new code:
 *
 *   import { currencyService } from '@/services/currency';
 *   const usd = await currencyService.convertToUSD(1000, 'INR');
 */
export {
  CurrencyService,
  currencyService,
  RATE_CACHE_TTL_MS as CURRENCY_RATE_CACHE_TTL_MS,
  type RateTable,
  type RateSnapshot,
} from './service';

export {
  CurrencyError,
  RateUnavailableError,
  UnsupportedCurrencyError,
  type CurrencyErrorCode,
} from './errors';
