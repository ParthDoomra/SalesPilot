/**
 * AzurePricingProvider — live Azure pricing via the official Azure Retail
 * Prices API (https://prices.azure.com/api/retail/prices).
 *
 *  • Fetches by service name / SKU / region using OData `$filter`.
 *  • Normalizes the raw `Items[]` into the shared `NormalizedPrice` shape.
 *  • Caches responses in-memory for 24h to reduce requests.
 *  • On API failure: serves the last cached response for that query.
 *  • If there is no cache at all: throws `PricingUnavailableError`.
 *
 * No API key is required. The provider is stateless across calls except for its
 * response cache, so it is safe to use as a module singleton.
 */

import {
  type CloudPricingProvider,
  type NormalizedPrice,
  type PricingQuery,
  PricingUnavailableError,
} from './types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AzurePricingProvider');

const ENDPOINT = 'https://prices.azure.com/api/retail/prices';
const API_VERSION = '2023-01-01-preview';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_MAX_PAGES = 1;

/** Raw item shape returned by the Azure Retail Prices API. */
interface AzureRetailItem {
  currencyCode: string;
  retailPrice: number;
  unitPrice: number;
  armRegionName?: string;
  location?: string;
  productName: string;
  skuName: string;
  meterName: string;
  serviceName: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
}

interface AzureRetailResponse {
  Items: AzureRetailItem[];
  NextPageLink: string | null;
  Count: number;
}

interface CacheEntry {
  at: number;
  data: NormalizedPrice[];
}

function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Build an OData `$filter` from the structured query. */
function buildFilter(query: PricingQuery): string {
  if (query.filter) return query.filter;
  const clauses: string[] = [];
  if (query.serviceName) clauses.push(`serviceName eq '${odataEscape(query.serviceName)}'`);
  if (query.skuName) clauses.push(`skuName eq '${odataEscape(query.skuName)}'`);
  if (query.productName) clauses.push(`productName eq '${odataEscape(query.productName)}'`);
  if (query.region) clauses.push(`armRegionName eq '${odataEscape(query.region)}'`);
  return clauses.join(' and ');
}

function normalize(item: AzureRetailItem): NormalizedPrice {
  return {
    provider: 'Azure',
    serviceName: item.serviceName,
    serviceFamily: item.serviceFamily,
    productName: item.productName,
    skuName: item.skuName,
    meterName: item.meterName,
    region: item.armRegionName ?? '',
    unitPrice: item.retailPrice,
    currencyCode: item.currencyCode,
    unitOfMeasure: item.unitOfMeasure,
    type: item.type,
  };
}

export class AzurePricingProvider implements CloudPricingProvider {
  readonly provider = 'Azure' as const;
  private cache = new Map<string, CacheEntry>();

  async getPrices(query: PricingQuery = {}): Promise<NormalizedPrice[]> {
    const currencyCode = query.currencyCode ?? 'USD';
    const filter = buildFilter(query);
    const maxPages = query.maxPages ?? DEFAULT_MAX_PAGES;
    const key = JSON.stringify({ filter, currencyCode, maxPages });

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const data = await this.fetchAll(filter, currencyCode, maxPages);
      this.cache.set(key, { at: Date.now(), data });
      return data;
    } catch (err) {
      // API unavailable → fall back to the last cached response for this query.
      if (cached) {
        logger.warn('Azure pricing fetch failed; serving stale cache', { key });
        return cached.data;
      }
      logger.error('Azure pricing fetch failed and no cache exists', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PricingUnavailableError('Azure', 'Azure Retail Prices API is unavailable and no cached pricing exists.');
    }
  }

  async search(
    term: string,
    opts: { region?: string; currencyCode?: string } = {},
  ): Promise<NormalizedPrice[]> {
    const safe = odataEscape(term);
    return this.getPrices({
      filter: `contains(serviceName, '${safe}') or contains(skuName, '${safe}')`,
      region: opts.region,
      currencyCode: opts.currencyCode,
    });
  }

  /** Fetch (and page through) the API, returning normalized prices. */
  private async fetchAll(filter: string, currencyCode: string, maxPages: number): Promise<NormalizedPrice[]> {
    const params = new URLSearchParams({ 'api-version': API_VERSION, currencyCode });
    if (filter) params.set('$filter', filter);

    let url: string | null = `${ENDPOINT}?${params.toString()}`;
    const out: NormalizedPrice[] = [];
    let page = 0;

    while (url && page < maxPages) {
      const res: Response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Azure Retail Prices API returned ${res.status}`);
      const body = (await res.json()) as AzureRetailResponse;
      for (const item of body.Items ?? []) out.push(normalize(item));
      url = body.NextPageLink;
      page += 1;
    }
    return out;
  }
}

/** Shared singleton — cache persists across requests within the server process. */
export const azurePricingProvider = new AzurePricingProvider();
