import type { ExchangeRateSnapshot } from './currency-service';
import { FALLBACK_RATES } from './fallback-rates';
import {
  INTERNAL_PRICING_CURRENCY,
  RATE_CACHE_STORAGE_KEY,
  RATE_CACHE_TTL_MS,
  SUPPORTED_CURRENCIES,
} from './constants';

function buildFallbackSnapshot(): ExchangeRateSnapshot {
  return {
    base: INTERNAL_PRICING_CURRENCY,
    rates: { ...FALLBACK_RATES },
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

/** Read cached rates from localStorage (client only). */
export function loadCachedRates(): ExchangeRateSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RATE_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRateSnapshot;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > RATE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedRates(snapshot: ExchangeRateSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RATE_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors — fallback rates still work.
  }
}

/** Fetch live USD-base rates from our API route (client) or directly (server). */
export async function fetchLiveRates(): Promise<ExchangeRateSnapshot> {
  const cached = loadCachedRates();
  if (cached) return { ...cached, source: 'cache' };

  try {
    const res = await fetch('/api/currency/rates');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = (await res.json()) as ExchangeRateSnapshot;
    saveCachedRates(data);
    return data;
  } catch {
    const fallback = buildFallbackSnapshot();
    saveCachedRates(fallback);
    return fallback;
  }
}

/** Server-side live fetch with fallback — used by the API route. */
export async function fetchRatesFromProvider(): Promise<ExchangeRateSnapshot> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 43200 },
    });
    if (!res.ok) throw new Error('Provider error');
    const data = await res.json();
    const rates: Record<string, number> = { USD: 1 };
    for (const code of SUPPORTED_CURRENCIES) {
      if (code === 'USD') continue;
      const rate = data.rates?.[code];
      if (typeof rate === 'number' && rate > 0) rates[code] = rate;
      else if (FALLBACK_RATES[code]) rates[code] = FALLBACK_RATES[code];
    }
    return {
      base: INTERNAL_PRICING_CURRENCY,
      rates,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  } catch {
    return buildFallbackSnapshot();
  }
}
