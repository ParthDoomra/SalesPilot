/**
 * @deprecated Import from `@/services/currency` instead.
 * Thin re-export layer kept so existing imports keep working.
 */
export {
  convertToUSD,
  convertFromUSD,
  formatCurrency,
  formatUsdForDisplay,
  formatCostRangeForDisplay,
  getCurrencySymbol,
  getExchangeRate,
  parseCostRangeToUsd,
  FALLBACK_RATES as EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from '@/services/currency';

/** @deprecated Use formatCostRangeForDisplay from `@/services/currency`. */
export { formatCostRangeForDisplay as formatRange } from '@/services/currency';

export { SYMBOL_TO_CODE } from '@/services/currency/constants';
