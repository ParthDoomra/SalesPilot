/**
 * Typed errors for the CurrencyService.
 *
 * These are thrown (never swallowed) so callers get a *clear, catchable*
 * failure instead of a crash on `undefined` rates. Always wrap conversion
 * calls in try/catch (or a hook error boundary) at the integration layer.
 */

export type CurrencyErrorCode =
  | 'RATE_UNAVAILABLE'
  | 'UNSUPPORTED_CURRENCY';

export class CurrencyError extends Error {
  readonly code: CurrencyErrorCode;

  constructor(message: string, code: CurrencyErrorCode) {
    super(message);
    this.name = 'CurrencyError';
    this.code = code;
    // Preserve prototype chain when targeting ES5-ish output.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when live rates cannot be fetched AND no cached rates exist to
 * fall back on. This is the "no data at all" case from requirement #5.
 */
export class RateUnavailableError extends CurrencyError {
  constructor(from: string, to: string, cause?: unknown) {
    super(
      `Exchange rate ${from} -> ${to} is unavailable: the rate provider could ` +
        `not be reached and no cached rate exists. Try again once connectivity ` +
        `is restored.`,
      'RATE_UNAVAILABLE',
    );
    this.name = 'RateUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/** Thrown when a currency code is not one of the supported currencies. */
export class UnsupportedCurrencyError extends CurrencyError {
  constructor(code: string) {
    super(
      `Unsupported currency "${code}". Supported currencies are: ` +
        `USD, INR, EUR, GBP, AED, SGD, CAD, AUD, JPY.`,
      'UNSUPPORTED_CURRENCY',
    );
    this.name = 'UnsupportedCurrencyError';
  }
}
