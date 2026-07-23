/**
 * Cloud pricing providers — registry + Azure catalog integration.
 *
 * Today only Azure is implemented (live Azure Retail Prices API). AWS and GCP
 * slot in here by implementing `CloudPricingProvider` and registering them in
 * `PROVIDERS` — nothing else changes.
 */

import { PROVIDER_MULTIPLIER } from '@/services/ai/pricing/catalog';
import { createLogger } from '@/utils/logger';
import { azurePricingProvider } from './azure-provider';
import type { CloudPricingProvider, PricingCloudProvider } from './types';

export * from './types';
export { azurePricingProvider, AzurePricingProvider } from './azure-provider';

const logger = createLogger('PricingProviders');

/** Registered live providers. Add AWS/GCP here when implemented. */
const PROVIDERS: Partial<Record<PricingCloudProvider, CloudPricingProvider>> = {
  Azure: azurePricingProvider,
};

/**
 * Returns the live pricing provider for a cloud, or throws if not yet
 * implemented. AWS/GCP will resolve here once registered above.
 */
export function getPricingProvider(provider: PricingCloudProvider): CloudPricingProvider {
  const impl = PROVIDERS[provider];
  if (!impl) throw new Error(`No live pricing provider registered for ${provider} yet.`);
  return impl;
}

// ---------------------------------------------------------------------------
// Replace the mock Azure pricing source used by the (unchanged) estimator.
//
// The catalog exposes a per-provider price index (`PROVIDER_MULTIPLIER`) that
// the estimator multiplies against its category base rates. Its Azure value was
// a hardcoded mock. `primeAzurePricing()` derives that index from a live Azure
// retail price and updates it in place — leaving the estimator's formula and the
// catalog module untouched. The pricing route calls this before estimating.
// ---------------------------------------------------------------------------

/** AWS general-purpose 2-vCPU Linux VM ≈ this hourly rate → provider index 1.0. */
const AWS_REFERENCE_HOURLY = 0.096;
/** Keep the derived index within a sane band so live data can't distort estimates. */
const INDEX_MIN = 0.9;
const INDEX_MAX = 1.2;
/** Last successfully derived index, reused if a later refresh fails. */
let lastAzureIndex: number | null = null;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Refresh the Azure price index from live retail data and write it into the
 * catalog. Never throws: if the API is unavailable and no cache exists, the
 * previous (mock/last-known) value is preserved so pricing never breaks.
 */
export async function primeAzurePricing(): Promise<void> {
  try {
    const prices = await azurePricingProvider.getPrices({
      serviceName: 'Virtual Machines',
      skuName: 'D2s v3',
      region: 'eastus',
      currencyCode: 'USD',
    });

    // Representative on-demand Linux hourly rate (exclude Windows/Spot/Low-Priority).
    const candidate = prices
      .filter(
        (p) =>
          p.type === 'Consumption' &&
          /hour/i.test(p.unitOfMeasure) &&
          p.unitPrice > 0 &&
          !/windows/i.test(p.productName) &&
          !/spot|low priority/i.test(`${p.skuName} ${p.meterName}`),
      )
      .sort((a, b) => a.unitPrice - b.unitPrice)[0];

    if (!candidate) {
      logger.warn('Azure prime: no representative VM price found; keeping current index');
      return;
    }

    const index = round2(clamp(candidate.unitPrice / AWS_REFERENCE_HOURLY, INDEX_MIN, INDEX_MAX));
    lastAzureIndex = index;
    PROVIDER_MULTIPLIER.Azure = index;
    logger.info('Azure price index refreshed from live retail data', {
      hourly: candidate.unitPrice,
      index,
    });
  } catch {
    // API unavailable and no cache → keep last-known live value if we have one,
    // otherwise leave the catalog's baseline value untouched.
    if (lastAzureIndex !== null) PROVIDER_MULTIPLIER.Azure = lastAzureIndex;
    logger.warn('Azure prime failed; using cached/baseline Azure index');
  }
}
