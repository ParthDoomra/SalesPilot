/**
 * AI Cost Estimation Engine (offline, catalog-based).
 *
 * Combines TWO inputs to produce a pricing report:
 *   1. The Phase 2 Requirement JSON  — budget, currency, region, employees,
 *      users, availability, compliance, security, disaster recovery.
 *   2. The Phase 3 Architecture JSON — selected cloud provider, cloud services,
 *      and architecture tier (option archetype + per-service tiers).
 *
 * It does NOT call live provider pricing APIs. Costs are derived from the
 * configurable pricing catalog, adjusted by requirement characteristics, and
 * blended with any per-service anchor ranges the architecture agent supplied.
 *
 * The concrete estimator is exposed behind the `PricingEstimator` interface so
 * a live-pricing implementation can be dropped in later without any UI change.
 */

import type {
  ArchitectureModel,
  ArchitectureOption,
  CloudServiceNode,
  RequirementModel,
  PricingEstimate,
  OptionCostEstimate,
  OptimizationProjection,
  CategoryCostGroup,
  ResourceCostEstimate,
  PricingCategory,
  BudgetAnalysis,
  BudgetConversionMeta,
  BudgetStatus,
  PricingBudgetConversion,
} from '@/types';
import { PRICING_CATEGORIES } from '@/types';
import {
  CATALOG_VERSION,
  ESTIMATE_CURRENCY,
  ANNUAL_DISCOUNT_RATE,
  CATEGORY_BASE_RATES,
  PROVIDER_MULTIPLIER,
  TIER_KEYWORD_MULTIPLIERS,
  OPTION_TYPE_MULTIPLIER,
  SERVICE_CATEGORY_TO_PRICING,
} from './catalog';
import { getCurrencySymbol, currencyService, RateUnavailableError } from '@/services/currency';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CostEstimator');

/** A pluggable pricing backend. Swap the catalog estimator for a live one later. */
export interface PricingEstimator {
  readonly name: string;
  estimate(architecture: ArchitectureModel, requirement?: RequirementModel | null): PricingEstimate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round = (n: number) => Math.round(n);

/** Safely read a requirement field's effective value. */
function fieldValue<T = unknown>(req: RequirementModel | null | undefined, key: keyof RequirementModel): T | null {
  if (!req) return null;
  const f = req[key] as unknown as { value?: T } | undefined;
  return (f && typeof f === 'object' && 'value' in f ? (f.value ?? null) : null) as T | null;
}

/** Detect the currency of an architecture anchor range from its symbol/code. */
function detectAnchorCurrency(range: string): 'INR' | 'EUR' | 'GBP' | 'JPY' | null {
  if (/₹|inr|rs\.?/i.test(range)) return 'INR';
  if (/€|eur/i.test(range)) return 'EUR';
  if (/£|gbp/i.test(range)) return 'GBP';
  if (/¥|jpy/i.test(range)) return 'JPY';
  return null;
}

/**
 * Parse an architecture anchor cost band into a USD midpoint. Parsing is local
 * string work; any currency conversion goes through CurrencyService (using the
 * pre-warmed 24h cache). Anchor bands are almost always USD; if a foreign band
 * appears and no rate is cached, we fall back to the raw figure so the estimate
 * still succeeds (the customer budget path, below, is the strict one).
 */
export function parseAnchorRangeUsd(range?: string): number | null {
  if (!range) return null;

  const numbers = (range.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) =>
    parseFloat(n.replace(/,/g, '')),
  );
  if (numbers.length === 0) return null;

  const mid = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const foreign = detectAnchorCurrency(range);

  let usd = mid;
  if (foreign) {
    try {
      usd = currencyService.convertToUSDSync(mid, foreign);
    } catch (err) {
      if (!(err instanceof RateUnavailableError)) throw err;
      usd = mid; // best-effort: treat as USD when no rate is cached.
    }
  }

  return Number.isFinite(usd) && usd > 0 ? usd : null;
}

function tierMultiplier(tier: string): number {
  const t = (tier ?? '').toLowerCase();
  for (const { keyword, multiplier } of TIER_KEYWORD_MULTIPLIERS) {
    if (t.includes(keyword)) return multiplier;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// Requirement-derived signals — how the customer requirement adjusts pricing
// ---------------------------------------------------------------------------

interface RequirementSignals {
  regionMult: number;
  scaleMult: number;
  availabilityUplift: number;
  drPresent: boolean;
  compliancePresent: boolean;
  securityPresent: boolean;
  usersText: string;
  regionText: string;
  availabilityText: string;
  complianceText: string;
}

function deriveSignals(req: RequirementModel | null | undefined): RequirementSignals {
  const region = String(fieldValue<string>(req, 'region') ?? '').toLowerCase();
  const users = Number(fieldValue<number>(req, 'users') ?? 0) || 0;
  const employees = Number(fieldValue<number>(req, 'employees') ?? 0) || 0;
  const availability = String(fieldValue<string>(req, 'availability') ?? '').toLowerCase();
  const dr = fieldValue<string>(req, 'disasterRecovery');
  const compliance = fieldValue<string[]>(req, 'compliance');
  const security = fieldValue<string>(req, 'security');

  // Region price index.
  let regionMult = 1.0;
  if (/india/.test(region)) regionMult = 0.85;
  else if (/europe|emea/.test(region)) regionMult = 1.08;
  else if (/apac|asia/.test(region)) regionMult = 0.95;
  else if (/us|america|united states/.test(region)) regionMult = 1.0;

  // Scale factor from the larger of users / employees.
  const scaleBasis = Math.max(users, employees);
  const scaleMult =
    scaleBasis >= 5000 ? 1.3 : scaleBasis >= 1000 ? 1.15 : scaleBasis >= 300 ? 1.05 : scaleBasis > 0 ? 0.95 : 1.0;

  // Availability / SLA uplift.
  let availabilityUplift = 1.0;
  if (/99\.99/.test(availability)) availabilityUplift = 1.15;
  else if (/99\.9|high availability|multi-?az|\bha\b/.test(availability)) availabilityUplift = 1.05;

  const drPresent = !!dr && !/none|no\b/i.test(String(dr));
  const compliancePresent = Array.isArray(compliance) && compliance.length > 0;
  const securityPresent = !!security;

  return {
    regionMult,
    scaleMult,
    availabilityUplift,
    drPresent,
    compliancePresent,
    securityPresent,
    usersText: users > 0 ? `${users.toLocaleString()} users` : employees > 0 ? `${employees.toLocaleString()} employees` : 'the stated user base',
    regionText: region ? `the ${region.replace(/\b\w/g, (c) => c.toUpperCase())} region` : 'the target region',
    availabilityText: availability ? `a ${availability} availability target` : 'standard availability',
    complianceText: compliancePresent ? `${(compliance as string[]).join(', ')} compliance` : 'baseline security',
  };
}

/** Per-category multiplier reflecting requirement-driven overhead. */
function categoryUplift(category: PricingCategory, s: RequirementSignals): number {
  switch (category) {
    case 'Compute':
      return s.availabilityUplift;
    case 'Database':
      return s.availabilityUplift * (s.drPresent ? 1.08 : 1);
    case 'Networking':
      return s.availabilityUplift;
    case 'Security':
      return (s.compliancePresent ? 1.2 : 1) * (s.securityPresent ? 1.1 : 1);
    case 'Monitoring':
      return s.compliancePresent ? 1.12 : 1;
    case 'Backup':
      return s.drPresent ? 1.3 : 1;
    default:
      return 1;
  }
}

// ---------------------------------------------------------------------------
// Resource / option estimation
// ---------------------------------------------------------------------------

function catalogMonthly(node: CloudServiceNode, category: PricingCategory, optionType: ArchitectureOption['type']): number {
  const base = CATEGORY_BASE_RATES[category];
  const provider = PROVIDER_MULTIPLIER[node.provider] ?? 1.0;
  const tier = tierMultiplier(node.tier);
  const scale = OPTION_TYPE_MULTIPLIER[optionType] ?? 1.0;
  return base * provider * tier * scale;
}

function estimateResource(
  node: CloudServiceNode,
  optionType: ArchitectureOption['type'],
  signals: RequirementSignals,
): ResourceCostEstimate {
  const category = SERVICE_CATEGORY_TO_PRICING[node.category] ?? 'Compute';
  const catalog = catalogMonthly(node, category, optionType);
  const anchor = parseAnchorRangeUsd(node.estimatedMonthlyCostRange);

  const reqFactor = signals.regionMult * signals.scaleMult * categoryUplift(category, signals);

  let blendedUsd: number;
  let confidence: number;
  let basis: string;

  if (anchor !== null) {
    blendedUsd = 0.6 * anchor + 0.4 * catalog;
    confidence = Math.min(96, Math.max(70, Math.round(node.confidence)));
    basis = 'Catalog + architecture cost band, adjusted for requirement';
  } else {
    blendedUsd = catalog;
    confidence = Math.min(88, Math.max(55, Math.round(node.confidence) - 12));
    basis = 'Catalog estimate (category, tier, provider) adjusted for requirement';
  }

  const monthlyCost = round(blendedUsd * reqFactor);
  return {
    id: `cost_${node.id}`,
    serviceId: node.id,
    serviceName: node.name,
    category,
    provider: node.provider,
    tier: node.tier,
    monthlyCost,
    yearlyCost: round(monthlyCost * 12 * (1 - ANNUAL_DISCOUNT_RATE)),
    confidence,
    basis,
  };
}

function groupByCategory(resources: ResourceCostEstimate[], monthlyTotal: number): CategoryCostGroup[] {
  return PRICING_CATEGORIES.map((category) => {
    const inCategory = resources.filter((r) => r.category === category);
    const monthlyCost = inCategory.reduce((sum, r) => sum + r.monthlyCost, 0);
    const yearlyCost = inCategory.reduce((sum, r) => sum + r.yearlyCost, 0);
    return {
      category,
      monthlyCost,
      yearlyCost,
      percentage: monthlyTotal > 0 ? Math.round((monthlyCost / monthlyTotal) * 100) : 0,
      resourceCount: inCategory.length,
    };
  }).filter((g) => g.resourceCount > 0);
}

interface BaseOptionEstimate {
  option: ArchitectureOption;
  resources: ResourceCostEstimate[];
  monthlyCost: number;
  yearlyCost: number;
  confidence: number;
  categories: CategoryCostGroup[];
}

function estimateOptionBase(option: ArchitectureOption, signals: RequirementSignals): BaseOptionEstimate {
  const resources = option.services.map((svc) => estimateResource(svc, option.type, signals));
  const monthlyCost = resources.reduce((sum, r) => sum + r.monthlyCost, 0);
  const yearlyCost = resources.reduce((sum, r) => sum + r.yearlyCost, 0);
  const weight = monthlyCost;
  const confidence =
    weight > 0
      ? Math.round(resources.reduce((sum, r) => sum + r.confidence * r.monthlyCost, 0) / weight)
      : resources.length > 0
        ? Math.round(resources.reduce((sum, r) => sum + r.confidence, 0) / resources.length)
        : 0;
  return { option, resources, monthlyCost, yearlyCost, confidence, categories: groupByCategory(resources, monthlyCost) };
}

// ---------------------------------------------------------------------------
// Budget analysis
// ---------------------------------------------------------------------------

/** The customer's budget, read from the requirement and converted to USD once. */
interface ResolvedBudget {
  /** Stated budget in the original currency (not period-normalised). */
  amount: number;
  period: string;
  /** Normalised ISO currency code. */
  currency: string;
  symbol: string;
  /** Budget normalised to monthly USD, used for all budget comparisons. */
  budgetMonthlyUSD: number;
  /** The conversion record persisted on the pricing report. */
  conversion: PricingBudgetConversion;
}

/**
 * Reads the customer's selected currency + budget from the requirement and
 * converts the budget to USD via CurrencyService (24h-cached rates). Returns
 * null when no usable budget was supplied, so no conversion is attempted.
 *
 * @throws {RateUnavailableError} when a conversion is required but the API is
 *   unavailable and no cached rate exists — the API route turns this into a
 *   meaningful error response instead of crashing.
 */
function resolveBudget(req: RequirementModel | null | undefined): ResolvedBudget | null {
  const amount = Number(fieldValue<number>(req, 'budget') ?? 0) || 0;
  const period = String(fieldValue<string>(req, 'budgetPeriod') ?? 'monthly').toLowerCase();
  const currency = String(fieldValue<string>(req, 'budgetCurrency') ?? ESTIMATE_CURRENCY).toUpperCase();
  if (amount <= 0) return null;

  // Currency conversion goes exclusively through CurrencyService; the
  // yearly/one-time -> monthly normalisation is a pricing concern done on USD.
  const { usdAmount, exchangeRate, exchangeRateDate } =
    currencyService.convertBudgetToUSDSync(amount, currency);
  const budgetMonthlyUSD =
    period === 'yearly' || period === 'one-time' ? usdAmount / 12 : usdAmount;

  return {
    amount,
    period,
    currency,
    symbol: getCurrencySymbol(currency),
    budgetMonthlyUSD,
    conversion: { originalAmount: amount, originalCurrency: currency, usdAmount, exchangeRate, exchangeRateDate },
  };
}

/**
 * Compares the estimated cost (already in USD) against the customer's budget.
 * The budget has already been converted to USD by {@link resolveBudget}; this
 * function performs no currency conversion of its own.
 */
function analyzeBudget(
  monthlyCostUsd: number,
  yearlyCostUsd: number,
  req: RequirementModel | null | undefined,
  resolved: ResolvedBudget | null,
): BudgetAnalysis {
  const period =
    resolved?.period ?? String(fieldValue<string>(req, 'budgetPeriod') ?? 'monthly').toLowerCase();
  const customerCurrency =
    resolved?.currency ??
    String(fieldValue<string>(req, 'budgetCurrency') ?? ESTIMATE_CURRENCY).toUpperCase();
  const customerSymbol = resolved?.symbol ?? getCurrencySymbol(customerCurrency);

  const empty: BudgetAnalysis = {
    hasBudget: false,
    customerBudget: null,
    customerCurrency,
    customerCurrencySymbol: customerSymbol,
    budgetPeriod: period,
    budgetConversion: null,
    budgetMonthlyUSD: null,
    budgetAnnualUSD: null,
    estimatedMonthlyCostUSD: monthlyCostUsd,
    estimatedAnnualCostUSD: yearlyCostUsd,
    differenceMonthlyUSD: null,
    differenceAnnualUSD: null,
    utilizationPercent: null,
    status: 'unknown',
    budgetMonthly: null,
    budgetAnnual: null,
    estimatedMonthlyCost: monthlyCostUsd,
    estimatedAnnualCost: yearlyCostUsd,
    differenceMonthly: null,
    differenceAnnual: null,
  };

  if (!resolved) return empty;

  const budgetMonthlyUSD = round(resolved.budgetMonthlyUSD);
  const budgetAnnualUSD = round(budgetMonthlyUSD * 12);
  const differenceMonthlyUSD = round(budgetMonthlyUSD - monthlyCostUsd);
  const utilizationPercent =
    budgetMonthlyUSD > 0 ? Math.round((monthlyCostUsd / budgetMonthlyUSD) * 100) : null;

  const conversionMeta: BudgetConversionMeta = {
    originalBudget: resolved.amount,
    originalCurrency: resolved.currency,
    convertedBudgetUSD: budgetMonthlyUSD,
    exchangeRate: resolved.conversion.exchangeRate,
    exchangeRateTimestamp: resolved.conversion.exchangeRateDate ?? new Date().toISOString(),
  };

  return {
    ...empty,
    hasBudget: true,
    customerBudget: resolved.amount,
    budgetConversion: conversionMeta,
    budgetMonthlyUSD,
    budgetAnnualUSD,
    differenceMonthlyUSD,
    differenceAnnualUSD: round(budgetAnnualUSD - yearlyCostUsd),
    utilizationPercent,
    status: monthlyCostUsd <= budgetMonthlyUSD ? 'within' : 'over',
    budgetMonthly: budgetMonthlyUSD,
    budgetAnnual: budgetAnnualUSD,
    estimatedMonthlyCost: monthlyCostUsd,
    estimatedAnnualCost: yearlyCostUsd,
    differenceMonthly: differenceMonthlyUSD,
    differenceAnnual: round(budgetAnnualUSD - yearlyCostUsd),
  };
}

// ---------------------------------------------------------------------------
// AI explanation + recommendations
// ---------------------------------------------------------------------------

import { formatCurrency as fmtCurrency } from '@/services/currency';

/** Money formatter for USD amounts shown in explanations (display layer converts). */
type MoneyFmt = (n: number) => string;
const makeFmt = (): MoneyFmt => (n: number) => fmtCurrency(n, ESTIMATE_CURRENCY);

function buildExplanation(
  base: BaseOptionEstimate,
  analysis: BudgetAnalysis,
  signals: RequirementSignals,
  provider: string,
  fmt: MoneyFmt,
): string {
  const drivers = [...base.resources].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 2);
  const driverText = drivers.map((d) => `${d.serviceName} (${d.category}, ~${fmt(d.monthlyCost)}/mo)`).join(' and ');

  const parts: string[] = [];
  parts.push(
    `This ${base.option.type} architecture on ${provider} is estimated at ${fmt(base.monthlyCost)}/month (${fmt(base.yearlyCost)}/year).`,
  );
  if (driverText) parts.push(`The largest cost drivers are ${driverText}.`);
  parts.push(
    `The estimate is driven up by ${signals.usersText}, ${signals.regionText}, ${signals.availabilityText}, ${signals.complianceText}${signals.drPresent ? ', and disaster-recovery provisioning' : ''}.`,
  );

  if (analysis.hasBudget && analysis.budgetMonthlyUSD !== null) {
    const budgetText = `${fmtCurrency(analysis.customerBudget ?? 0, analysis.customerCurrencySymbol)} / ${analysis.budgetPeriod}`;
    if (analysis.status === 'within') {
      parts.push(
        `This fits within the customer's budget of ${budgetText}, using about ${analysis.utilizationPercent}% of the available monthly spend.`,
      );
    } else {
      parts.push(
        `This exceeds the customer's budget of ${budgetText} by ${fmt(Math.abs(analysis.differenceMonthlyUSD ?? 0))}/month (${analysis.utilizationPercent}% utilization) — see recommendations below.`,
      );
    }
  } else {
    parts.push('No customer budget was captured in the requirement, so no budget comparison is shown.');
  }
  return parts.join(' ');
}

/**
 * Builds cost-reduction recommendations. When over budget these are the levers
 * needed to get back within budget; when already within budget the same levers
 * are surfaced as *optional* savings opportunities.
 */
function buildRecommendations(
  base: BaseOptionEstimate,
  analysis: BudgetAnalysis,
  signals: RequirementSignals,
  allBases: BaseOptionEstimate[],
  fmt: MoneyFmt,
): string[] {
  const recs: string[] = [];
  const overBudget = analysis.hasBudget && analysis.status === 'over' && analysis.budgetMonthlyUSD !== null;

  // Suggest the cheapest alternative that fits the budget (only when over budget).
  if (overBudget) {
    const cheaperFit = allBases
      .filter((b) => b.option.id !== base.option.id && b.monthlyCost <= (analysis.budgetMonthlyUSD as number))
      .sort((a, b) => b.monthlyCost - a.monthlyCost)[0];
    if (cheaperFit) {
      recs.push(
        `Switch to the ${cheaperFit.option.type} alternative (~${fmt(cheaperFit.monthlyCost)}/mo), which fits within the customer's budget.`,
      );
    }
  }

  if (base.option.type !== 'budget') {
    recs.push('Move to a smaller compute tier (burstable / auto-scaling) sized to actual load rather than peak.');
  }
  recs.push('Apply Reserved Instances / annual committed-use pricing for roughly 10–20% savings versus on-demand.');
  recs.push('Right-size the database tier (or use an auto-pausing serverless tier) to cut idle database spend.');
  if (signals.drPresent) {
    recs.push('Relax multi-region disaster recovery to a single-region backup strategy to reduce DR replication cost.');
  }
  recs.push('Optimize backup retention/frequency and tier cold data to lower-cost archive storage.');
  recs.push('Move infrequently-accessed storage to a lower redundancy/access tier (e.g. LRS / cool tier).');
  if (signals.availabilityUplift >= 1.15) {
    recs.push('Target a 99.9% SLA instead of 99.99% to avoid premium zone-redundant/active-active redundancy.');
  }

  return Array.from(new Set(recs)).slice(0, 5);
}

/** Savings percentage applicable to this option from the recommendation levers. */
function optimizationSavingsPct(base: BaseOptionEstimate, signals: RequirementSignals): number {
  let pct = 0.15; // Reserved / committed-use pricing — always applicable.
  pct += base.option.type === 'budget' ? 0.04 : 0.08; // Compute right-sizing.
  pct += 0.04; // Database right-sizing / serverless.
  if (signals.drPresent) pct += 0.06; // DR relaxation.
  if (signals.availabilityUplift >= 1.15) pct += 0.05; // SLA relaxation.
  pct += 0.03; // Backup + storage tiering.
  return Math.min(0.4, pct);
}

/** Projects the impact of applying the recommendations, in the report currency. */
function buildOptimization(
  base: BaseOptionEstimate,
  analysis: BudgetAnalysis,
  signals: RequirementSignals,
): OptimizationProjection | null {
  if (base.monthlyCost <= 0) return null;
  const pct = optimizationSavingsPct(base, signals);
  const newMonthlyCost = round(base.monthlyCost * (1 - pct));
  const newYearlyCost = round(newMonthlyCost * 12 * (1 - ANNUAL_DISCOUNT_RATE));
  const newStatus: BudgetStatus =
    analysis.hasBudget && analysis.budgetMonthlyUSD !== null
      ? newMonthlyCost <= analysis.budgetMonthlyUSD
        ? 'within'
        : 'over'
      : 'unknown';
  return {
    estimatedMonthlySavings: base.monthlyCost - newMonthlyCost,
    estimatedYearlySavings: base.yearlyCost - newYearlyCost,
    newMonthlyCost,
    newYearlyCost,
    newStatus,
    isRequired: analysis.status === 'over',
  };
}

// ---------------------------------------------------------------------------
// Catalog estimator implementation
// ---------------------------------------------------------------------------

export const catalogEstimator: PricingEstimator = {
  name: CATALOG_VERSION,
  estimate(architecture: ArchitectureModel, requirement?: RequirementModel | null): PricingEstimate {
    const signals = deriveSignals(requirement);
    const fmt = makeFmt();
    // Read the customer's selected currency and convert their budget to USD once
    // (via CurrencyService). All pricing calculations below are in USD.
    const resolvedBudget = resolveBudget(requirement);
    const bases = architecture.options.map((o) => estimateOptionBase(o, signals));

    const options: OptionCostEstimate[] = bases.map((base) => {
      const budgetAnalysis = analyzeBudget(base.monthlyCost, base.yearlyCost, requirement, resolvedBudget);
      const explanation = buildExplanation(base, budgetAnalysis, signals, architecture.selectedProvider, fmt);
      const recommendations = buildRecommendations(base, budgetAnalysis, signals, bases, fmt);
      const optimization = buildOptimization(base, budgetAnalysis, signals);
      return {
        optionId: base.option.id,
        optionName: base.option.name,
        optionType: base.option.type,
        monthlyCost: base.monthlyCost,
        yearlyCost: base.yearlyCost,
        confidence: base.confidence,
        categories: base.categories,
        resources: base.resources,
        budgetAnalysis,
        explanation,
        recommendations,
        optimization,
      };
    });

    logger.info('Pricing estimated', {
      projectId: architecture.projectId,
      provider: architecture.selectedProvider,
      currency: ESTIMATE_CURRENCY,
      options: options.length,
      hasRequirement: !!requirement,
      hasBudget: options[0]?.budgetAnalysis.hasBudget,
    });

    return {
      id: `price_${architecture.id}`,
      projectId: architecture.projectId,
      architectureId: architecture.id,
      provider: architecture.selectedProvider,
      currency: ESTIMATE_CURRENCY,
      currencySymbol: getCurrencySymbol(ESTIMATE_CURRENCY),
      options,
      selectedOptionId: architecture.selectedOptionId,
      catalogVersion: CATALOG_VERSION,
      disclaimer:
        'All figures are AI-generated estimates derived from an offline pricing catalog, the ' +
        'generated architecture, and the customer requirement — not live Azure/AWS/GCP pricing. ' +
        'Actual invoiced costs will vary with region, usage, discounts, and commitments.',
      currencyConversion: resolvedBudget?.conversion ?? null,
      generatedAt: new Date().toISOString(),
    };
  },
};

/**
 * Returns the active pricing estimator. Today this is always the offline
 * catalog estimator; a live-pricing implementation can be selected here later
 * (e.g. based on an env flag) without changing any caller or UI.
 */
export function getPricingEstimator(): PricingEstimator {
  return catalogEstimator;
}
