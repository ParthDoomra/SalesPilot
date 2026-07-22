/**
 * Pricing Catalog — configurable estimation reference data.
 *
 * This is the single source of truth for the offline cost estimator. It is
 * intentionally data-only (no logic) so the numbers can be tuned, versioned,
 * or regionalised without touching the engine, and so a live-pricing provider
 * could later be swapped in behind the same estimator interface.
 *
 * All base rates are expressed in USD / month for a single "Standard" unit of
 * the category. The estimator multiplies these by provider, tier, and scale
 * factors and blends them with any per-service anchor ranges the architecture
 * agent supplied.
 */

import type { CloudProvider, ServiceCategory } from '@/types';
import type { PricingCategory } from '@/types';

export const CATALOG_VERSION = 'catalog-2026.07-offline';

/**
 * Base (internal) estimate currency. All catalog rates are authored in USD;
 * the estimator converts final figures into the customer's requested currency
 * using EXCHANGE_RATES so nothing in the report ever mixes currencies.
 */
export const ESTIMATE_CURRENCY = 'USD';
export const ESTIMATE_CURRENCY_SYMBOL = '$';

/**
 * Units of the target currency per 1 USD. Used to present every monetary value
 * in the currency the customer selected in their requirement (Phase 2). Kept in
 * the catalog (data-only) so rates can be tuned without touching the engine.
 */
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
};

/** Display symbol per supported currency code. */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
};

/**
 * Annual commitment discount applied to the yearly figure (e.g. reserved /
 * committed-use pricing). 0 = yearly is exactly 12× monthly.
 */
export const ANNUAL_DISCOUNT_RATE = 0.1; // 10% off for annual commitment

/** Baseline monthly USD cost for one Standard-tier unit of each category. */
export const CATEGORY_BASE_RATES: Record<PricingCategory, number> = {
  Compute: 420,
  Database: 520,
  Storage: 90,
  Networking: 160,
  Security: 140,
  Backup: 110,
  Monitoring: 70,
};

/** Relative price index per provider (AWS as the 1.00 baseline). */
export const PROVIDER_MULTIPLIER: Record<CloudProvider, number> = {
  AWS: 1.0,
  Azure: 1.04,
  GCP: 0.94,
};

/**
 * Tier keyword → multiplier. The estimator scans the service tier string
 * (lower-cased) and applies the first keyword that matches. Ordered most- to
 * least-expensive so the strongest signal wins.
 */
export const TIER_KEYWORD_MULTIPLIERS: Array<{ keyword: string; multiplier: number }> = [
  { keyword: 'business critical', multiplier: 2.4 },
  { keyword: 'enterprise', multiplier: 2.1 },
  { keyword: 'premium', multiplier: 1.8 },
  { keyword: 'p2v3', multiplier: 1.9 },
  { keyword: 'p1v3', multiplier: 1.5 },
  { keyword: 'geo-redundant', multiplier: 1.6 },
  { keyword: 'grs', multiplier: 1.6 },
  { keyword: 'multi-az', multiplier: 1.5 },
  { keyword: 'multi-region', multiplier: 1.7 },
  { keyword: 'high density', multiplier: 1.6 },
  { keyword: 'zone-redundant', multiplier: 1.35 },
  { keyword: 'zrs', multiplier: 1.35 },
  { keyword: 'production', multiplier: 1.2 },
  { keyword: 'general purpose', multiplier: 1.1 },
  { keyword: 'standard', multiplier: 1.0 },
  { keyword: 'burstable', multiplier: 0.6 },
  { keyword: 'serverless', multiplier: 0.65 },
  { keyword: 'locally redundant', multiplier: 0.75 },
  { keyword: 'lrs', multiplier: 0.75 },
];

/** Architecture option archetype → scale multiplier. */
export const OPTION_TYPE_MULTIPLIER: Record<'performance' | 'balanced' | 'budget', number> = {
  performance: 1.25,
  balanced: 1.0,
  budget: 0.78,
};

/**
 * Maps the architecture's ServiceCategory onto a pricing bucket. The
 * architecture layer uses "Management" and "Backup & DR"; pricing rolls these
 * up into "Monitoring" and "Backup" respectively.
 */
export const SERVICE_CATEGORY_TO_PRICING: Record<ServiceCategory, PricingCategory> = {
  Compute: 'Compute',
  Database: 'Database',
  Storage: 'Storage',
  Networking: 'Networking',
  Security: 'Security',
  Management: 'Monitoring',
  'Backup & DR': 'Backup',
};
