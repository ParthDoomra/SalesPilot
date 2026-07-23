/**
 * Static fallback exchange rates — units of each currency per 1 USD.
 * Used when the live rate API is unavailable and no cache exists.
 */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SGD: 1.35,
  AUD: 1.52,
  CAD: 1.36,
  JPY: 157,
};
