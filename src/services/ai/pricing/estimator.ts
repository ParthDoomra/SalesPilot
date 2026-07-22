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
  BudgetStatus,
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
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from './catalog';
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
/** Used only to normalise INR-denominated architecture anchor ranges back to the USD base. */
const INR_PER_USD = EXCHANGE_RATES.INR;

const currencySymbol = (code?: string) => (code ? CURRENCY_SYMBOLS[code.toUpperCase()] ?? `${code} ` : '$');

/**
 * Resolves the report currency from the requirement (Phase 2). Everything in the
 * report is presented in this single currency — costs, budget, and charts — so
 * currencies are never mixed. Unknown codes fall back to USD.
 */
function resolveCurrency(req: RequirementModel | null | undefined): { code: string; symbol: string; rate: number } {
  const raw = String(fieldValue<string>(req, 'budgetCurrency') ?? ESTIMATE_CURRENCY).toUpperCase();
  const code = raw in EXCHANGE_RATES ? raw : ESTIMATE_CURRENCY;
  return { code, symbol: currencySymbol(code), rate: EXCHANGE_RATES[code] };
}

/** Safely read a requirement field's effective value. */
function fieldValue<T = unknown>(req: RequirementModel | null | undefined, key: keyof RequirementModel): T | null {
  if (!req) return null;
  const f = req[key] as unknown as { value?: T } | undefined;
  return (f && typeof f === 'object' && 'value' in f ? (f.value ?? null) : null) as T | null;
}

export function parseAnchorRangeUsd(range?: string): number | null {
  if (!range) return null;
  const isInr = /₹|inr|rs\.?/i.test(range);
  const numbers = (range.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => parseFloat(n.replace(/,/g, '')));
  if (numbers.length === 0) return null;
  const mid = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const usd = isInr ? mid / INR_PER_USD : mid;
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
  /** USD → target-currency conversion rate. Every returned figure is in target currency. */
  rate: number,
): ResourceCostEstimate {
  const category = SERVICE_CATEGORY_TO_PRICING[node.category] ?? 'Compute';
  const catalog = catalogMonthly(node, category, optionType);
  const anchor = parseAnchorRangeUsd(node.estimatedMonthlyCostRange);

  // Requirement-driven adjustment: region × scale × category-specific overhead.
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

  // Convert into the customer's currency as the final step.
  const monthlyCost = round(blendedUsd * reqFactor * rate);
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

function estimateOptionBase(option: ArchitectureOption, signals: RequirementSignals, rate: number): BaseOptionEstimate {
  const resources = option.services.map((svc) => estimateResource(svc, option.type, signals, rate));
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

/**
 * Compares the estimated cost against the customer's budget. Both sides are in
 * the SAME (customer) currency: the estimated monthly/yearly costs passed in are
 * already converted to the customer's currency, and the budget is stated in that
 * currency in the requirement — so no cross-currency comparison ever happens.
 */
function analyzeBudget(
  monthlyCost: number,
  yearlyCost: number,
  req: RequirementModel | null | undefined,
  currency: { code: string; symbol: string },
): BudgetAnalysis {
  const amount = Number(fieldValue<number>(req, 'budget') ?? 0) || 0;
  const period = String(fieldValue<string>(req, 'budgetPeriod') ?? 'monthly').toLowerCase();

  const base: BudgetAnalysis = {
    hasBudget: false,
    customerBudget: null,
    customerCurrency: currency.code,
    customerCurrencySymbol: currency.symbol,
    budgetPeriod: period,
    budgetMonthly: null,
    budgetAnnual: null,
    estimatedMonthlyCost: monthlyCost,
    estimatedAnnualCost: yearlyCost,
    differenceMonthly: null,
    differenceAnnual: null,
    utilizationPercent: null,
    status: 'unknown' as BudgetStatus,
  };

  if (amount <= 0) return base;

  // Normalise the stated budget to a monthly figure in the customer's currency.
  // "one-time" is treated as an annual figure.
  const budgetMonthly = period === 'yearly' || period === 'one-time' ? amount / 12 : amount;
  const budgetAnnual = budgetMonthly * 12;

  const differenceMonthly = round(budgetMonthly - monthlyCost);
  const utilizationPercent = budgetMonthly > 0 ? Math.round((monthlyCost / budgetMonthly) * 100) : null;

  return {
    ...base,
    hasBudget: true,
    customerBudget: amount,
    budgetMonthly: round(budgetMonthly),
    budgetAnnual: round(budgetAnnual),
    differenceMonthly,
    differenceAnnual: round(budgetAnnual - yearlyCost),
    utilizationPercent,
    status: monthlyCost <= budgetMonthly ? 'within' : 'over',
  };
}

// ---------------------------------------------------------------------------
// AI explanation + recommendations
// ---------------------------------------------------------------------------

/** Money formatter bound to the report's currency symbol. */
type MoneyFmt = (n: number) => string;
const makeFmt = (symbol: string): MoneyFmt => (n: number) => `${symbol}${round(n).toLocaleString()}`;

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

  if (analysis.hasBudget && analysis.budgetMonthly !== null) {
    const budgetText = `${analysis.customerCurrencySymbol}${analysis.customerBudget?.toLocaleString()} / ${analysis.budgetPeriod}`;
    if (analysis.status === 'within') {
      parts.push(
        `This fits within the customer's budget of ${budgetText}, using about ${analysis.utilizationPercent}% of the available monthly spend.`,
      );
    } else {
      parts.push(
        `This exceeds the customer's budget of ${budgetText} by ${fmt(Math.abs(analysis.differenceMonthly ?? 0))}/month (${analysis.utilizationPercent}% utilization) — see recommendations below.`,
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
  const overBudget = analysis.hasBudget && analysis.status === 'over' && analysis.budgetMonthly !== null;

  // Suggest the cheapest alternative that fits the budget (only when over budget).
  if (overBudget) {
    const cheaperFit = allBases
      .filter((b) => b.option.id !== base.option.id && b.monthlyCost <= (analysis.budgetMonthly as number))
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
    analysis.hasBudget && analysis.budgetMonthly !== null
      ? newMonthlyCost <= analysis.budgetMonthly
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
    // Single report currency, taken from the requirement. All figures below are
    // produced directly in this currency so nothing ever mixes currencies.
    const currency = resolveCurrency(requirement);
    const fmt = makeFmt(currency.symbol);
    const bases = architecture.options.map((o) => estimateOptionBase(o, signals, currency.rate));

    const options: OptionCostEstimate[] = bases.map((base) => {
      const budgetAnalysis = analyzeBudget(base.monthlyCost, base.yearlyCost, requirement, currency);
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
      currency: currency.code,
      options: options.length,
      hasRequirement: !!requirement,
      hasBudget: options[0]?.budgetAnalysis.hasBudget,
    });

    return {
      id: `price_${architecture.id}`,
      projectId: architecture.projectId,
      architectureId: architecture.id,
      provider: architecture.selectedProvider,
      currency: currency.code,
      currencySymbol: currency.symbol,
      options,
      selectedOptionId: architecture.selectedOptionId,
      catalogVersion: CATALOG_VERSION,
      disclaimer:
        'All figures are AI-generated estimates derived from an offline pricing catalog, the ' +
        'generated architecture, and the customer requirement — not live Azure/AWS/GCP pricing. ' +
        'Actual invoiced costs will vary with region, usage, discounts, and commitments.',
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
