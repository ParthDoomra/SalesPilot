/**
 * Cloud pricing provider abstraction.
 *
 * A `CloudPricingProvider` fetches live, normalized unit prices for a single
 * cloud. Azure is implemented today (Azure Retail Prices API); AWS and GCP can
 * be added later by implementing this same interface and registering them — no
 * consumer changes required.
 */

export type PricingCloudProvider = 'Azure' | 'AWS' | 'GCP';

/** A single normalized price line, provider-agnostic. */
export interface NormalizedPrice {
  provider: PricingCloudProvider;
  /** e.g. "Virtual Machines", "Storage", "Azure SQL Database". */
  serviceName: string;
  /** Broad grouping, e.g. "Compute". */
  serviceFamily: string;
  /** Marketed product name, e.g. "Virtual Machines Dv3 Series". */
  productName: string;
  /** SKU, e.g. "D2s v3". */
  skuName: string;
  /** Meter name, e.g. "D2s v3". */
  meterName: string;
  /** Normalized region id, e.g. "eastus" (empty = global). */
  region: string;
  /** Retail unit price in `currencyCode`. */
  unitPrice: number;
  currencyCode: string;
  /** Unit the price applies to, e.g. "1 Hour", "1 GB/Month". */
  unitOfMeasure: string;
  /** Price type: "Consumption" | "Reservation" | "DevTestConsumption" | … */
  type: string;
}

/** A query against a provider's price list. */
export interface PricingQuery {
  serviceName?: string;
  skuName?: string;
  productName?: string;
  /** Provider region id (Azure `armRegionName`). */
  region?: string;
  /** ISO currency for returned prices (default "USD"). */
  currencyCode?: string;
  /** Raw provider filter override (advanced). */
  filter?: string;
  /** Max result pages to fetch (each page ~100 items). Default 1. */
  maxPages?: number;
}

export interface CloudPricingProvider {
  readonly provider: PricingCloudProvider;
  /** Fetch normalized prices for a structured query (cached, with fallback). */
  getPrices(query?: PricingQuery): Promise<NormalizedPrice[]>;
  /** Convenience: search by service-name or SKU term (cached, with fallback). */
  search(term: string, opts?: { region?: string; currencyCode?: string }): Promise<NormalizedPrice[]>;
}

/** Thrown when a provider has no live response AND no cached response to fall back to. */
export class PricingUnavailableError extends Error {
  constructor(
    public readonly provider: PricingCloudProvider,
    message?: string,
  ) {
    super(message ?? `${provider} pricing is unavailable and no cached data exists.`);
    this.name = 'PricingUnavailableError';
  }
}
