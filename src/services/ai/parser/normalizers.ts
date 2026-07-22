/**
 * Value Normalizers — clean, standardize, and validate extracted values.
 *
 * Currency symbols → ISO codes, region aliases → canonical names,
 * numeric strings → numbers, etc.
 */

import type { RequirementFieldKey } from '@/types';

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

const CURRENCY_MAP: Record<string, string> = {
  '₹': 'INR', 'rs': 'INR', 'rs.': 'INR', 'inr': 'INR', 'rupees': 'INR', 'rupee': 'INR',
  '$': 'USD', 'usd': 'USD', 'dollars': 'USD', 'dollar': 'USD',
  '€': 'EUR', 'eur': 'EUR', 'euros': 'EUR', 'euro': 'EUR',
  '£': 'GBP', 'gbp': 'GBP', 'pounds': 'GBP', 'pound': 'GBP',
  '¥': 'JPY', 'jpy': 'JPY', 'yen': 'JPY',
};

export function normalizeCurrency(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  return CURRENCY_MAP[key] ?? raw.trim().toUpperCase();
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function normalizeNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  if (typeof raw === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = raw.replace(/[₹$€£¥,\s]/g, '').trim();
    // Handle "300K", "1M" etc.
    const multipliers: Record<string, number> = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };
    const suffixMatch = cleaned.match(/^([\d.]+)\s*([kmb])$/i);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      const mult = multipliers[suffixMatch[2].toLowerCase()] ?? 1;
      return isNaN(num) ? null : num * mult;
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

const REGION_ALIASES: Record<string, string> = {
  'us': 'United States', 'usa': 'United States', 'united states': 'United States',
  'uk': 'United Kingdom', 'united kingdom': 'United Kingdom',
  'eu': 'Europe', 'europe': 'Europe',
  'india': 'India', 'in': 'India',
  'apac': 'Asia Pacific', 'asia pacific': 'Asia Pacific', 'asia-pacific': 'Asia Pacific',
  'middle east': 'Middle East', 'me': 'Middle East',
  'latam': 'Latin America', 'latin america': 'Latin America',
};

export function normalizeRegion(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  return REGION_ALIASES[key] ?? raw.trim();
}

// ---------------------------------------------------------------------------
// String arrays (compliance, etc.)
// ---------------------------------------------------------------------------

export function normalizeStringArray(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
      .filter(Boolean);
    return cleaned.length > 0 ? [...new Set(cleaned)] : null;
  }
  if (typeof raw === 'string') {
    const items = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? [...new Set(items)] : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generic normalizer dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatches to the appropriate normalizer based on the field key.
 */
export function normalizeValue(key: RequirementFieldKey, raw: unknown): unknown {
  switch (key) {
    case 'budget':
    case 'employees':
    case 'users':
      return normalizeNumber(raw);
    case 'budgetCurrency':
      return normalizeCurrency(raw);
    case 'region':
      return normalizeRegion(raw);
    case 'compliance':
      return normalizeStringArray(raw);
    case 'budgetPeriod': {
      if (typeof raw !== 'string') return null;
      const lower = raw.toLowerCase().trim();
      if (['monthly', 'yearly', 'one-time', 'onetime', 'annual', 'annually'].includes(lower)) {
        if (lower === 'annual' || lower === 'annually') return 'yearly';
        if (lower === 'onetime') return 'one-time';
        return lower;
      }
      return raw;
    }
    default:
      // String fields — just trim
      if (typeof raw === 'string') return raw.trim() || null;
      if (raw === null || raw === undefined) return null;
      return raw;
  }
}
