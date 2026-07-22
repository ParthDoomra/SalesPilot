/** Shared money formatting for the pricing view. */

export function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

/** Colour class for a confidence score, matching the app's semantic tokens. */
export function confidenceTone(confidence: number): string {
  if (confidence >= 85) return 'text-success';
  if (confidence >= 70) return 'text-signal';
  return 'text-amber';
}
