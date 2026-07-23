/** ISO codes supported for display and budget entry. */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'AUD',
  'CAD',
  'JPY',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const INTERNAL_PRICING_CURRENCY = 'USD' as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
};

export const CODE_TO_LOCALE: Record<string, string> = {
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
  JPY: 'ja-JP',
};

export const SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD',
  '₹': 'INR',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'A$': 'AUD',
  'C$': 'CAD',
  'S$': 'SGD',
};

/** How long live exchange rates remain valid (12 hours). */
export const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export const RATE_CACHE_STORAGE_KEY = 'salespilot_exchange_rates';
