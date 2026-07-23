/**
 * Phase 4 — AI Cost Estimation Engine Types
 *
 * Estimates are DERIVED from the Phase 3 ArchitectureModel using a configurable
 * pricing catalog (see `services/ai/pricing/catalog.ts`) plus architecture
 * characteristics — never from live provider pricing APIs. Every monetary value
 * is an estimate and must be surfaced in the UI as "Estimated Cost".
 */

import type { CloudProvider } from './architecture';

/** Cost buckets shown in the pricing tables and charts. */
export type PricingCategory =
  | 'Compute'
  | 'Database'
  | 'Storage'
  | 'Networking'
  | 'Security'
  | 'Backup'
  | 'Monitoring';

export const PRICING_CATEGORIES: PricingCategory[] = [
  'Compute',
  'Database',
  'Storage',
  'Networking',
  'Security',
  'Backup',
  'Monitoring',
];

/** Per-resource (per cloud service) estimated cost. */
export interface ResourceCostEstimate {
  id: string;
  serviceId: string;
  serviceName: string;
  category: PricingCategory;
  provider: CloudProvider;
  tier: string;
  /** Estimated monthly cost in USD (internal pricing currency). */
  monthlyCost: number;
  /** Estimated yearly cost in USD. */
  yearlyCost: number;
  /** 0–100 confidence in this line-item estimate. */
  confidence: number;
  /** How the estimate was derived — for transparency in the UI/tooltip. */
  basis: string;
}

/** Costs grouped into one category (Compute, Database, …). */
export interface CategoryCostGroup {
  category: PricingCategory;
  monthlyCost: number;
  yearlyCost: number;
  /** Share of the option's monthly total, 0–100. */
  percentage: number;
  resourceCount: number;
}

export type BudgetStatus = 'within' | 'over' | 'unknown';

/** Budget conversion metadata captured before pricing comparison. */
export interface BudgetConversionMeta {
  originalBudget: number;
  originalCurrency: string;
  convertedBudgetUSD: number;
  exchangeRate: number;
  exchangeRateTimestamp: string;
}

/** Compares an option's estimated cost against the customer's stated budget. */
export interface BudgetAnalysis {
  /** Whether the requirement supplied a usable budget. */
  hasBudget: boolean;
  /** Budget as stated by the customer (original currency & period). */
  customerBudget: number | null;
  customerCurrency: string;
  customerCurrencySymbol: string;
  budgetPeriod: string;
  /** Budget conversion metadata (original → USD). */
  budgetConversion: BudgetConversionMeta | null;
  /** Customer budget normalised to monthly USD for comparison. */
  budgetMonthlyUSD: number | null;
  budgetAnnualUSD: number | null;
  /** Estimated costs — always in USD (internal pricing currency). */
  estimatedMonthlyCostUSD: number;
  estimatedAnnualCostUSD: number;
  /** budgetMonthlyUSD − estimatedMonthlyCostUSD (positive = under budget). */
  differenceMonthlyUSD: number | null;
  differenceAnnualUSD: number | null;
  /** estimatedMonthlyCostUSD / budgetMonthlyUSD × 100. */
  utilizationPercent: number | null;
  status: BudgetStatus;
  /** @deprecated Use estimatedMonthlyCostUSD — kept for migration. */
  budgetMonthly: number | null;
  /** @deprecated Use estimatedMonthlyCostUSD */
  budgetAnnual: number | null;
  /** @deprecated Use estimatedMonthlyCostUSD */
  estimatedMonthlyCost: number;
  /** @deprecated Use estimatedAnnualCostUSD */
  estimatedAnnualCost: number;
  /** @deprecated Use differenceMonthlyUSD */
  differenceMonthly: number | null;
  /** @deprecated Use differenceAnnualUSD */
  differenceAnnual: number | null;
}

/** Full estimate for a single architecture option (Performance / Balanced / Budget). */
export interface OptionCostEstimate {
  optionId: string;
  optionName: string;
  optionType: 'performance' | 'balanced' | 'budget';
  monthlyCost: number;
  yearlyCost: number;
  /** Cost-weighted average confidence across all resources, 0–100. */
  confidence: number;
  categories: CategoryCostGroup[];
  resources: ResourceCostEstimate[];
  /** Budget comparison for this option (uses the requirement's budget). */
  budgetAnalysis: BudgetAnalysis;
  /** AI-generated natural-language explanation of the estimate. */
  explanation: string;
  /** Actionable recommendations (cost-reduction when over budget, optional savings otherwise). */
  recommendations: string[];
  /**
   * Projected impact of applying the recommendations, in the estimate currency.
   * Present whenever there is at least one recommendation to act on.
   */
  optimization: OptimizationProjection | null;
}

/** The projected result of applying the cost-optimization recommendations. */
export interface OptimizationProjection {
  /** Estimated monthly saving vs. the current option (estimate currency). */
  estimatedMonthlySavings: number;
  /** Estimated yearly saving vs. the current option. */
  estimatedYearlySavings: number;
  newMonthlyCost: number;
  newYearlyCost: number;
  /** Budget status after applying the optimizations. */
  newStatus: BudgetStatus;
  /** Whether these figures are required (over budget) or optional (already within). */
  isRequired: boolean;
}

/**
 * Canonical record of the customer-budget → USD conversion performed when the
 * pricing report was generated. Persisted on the estimate so downstream modules
 * (Dashboard, Proposal, exports) can show the original amount, the USD amount
 * used for all calculations, and the exact rate/date that was applied — without
 * re-running any conversion. All conversion goes through CurrencyService.
 */
export interface PricingBudgetConversion {
  /** Customer budget as stated, in their original currency (not period-normalised). */
  originalAmount: number;
  /** ISO code of the customer's selected currency, e.g. "INR". */
  originalCurrency: string;
  /** The budget converted to USD (monthly) — what pricing calculations used. */
  usdAmount: number;
  /** Applied rate as "units of originalCurrency per 1 USD" (e.g. 96.57 for INR). */
  exchangeRate: number;
  /** Provider's reference date for the rate (YYYY-MM-DD), or null if unknown. */
  exchangeRateDate: string | null;
}

/** The complete pricing estimate for a project's architecture. */
export interface PricingEstimate {
  id: string;
  projectId: string;
  architectureId: string;
  provider: CloudProvider;
  /** ISO currency code — always USD (internal pricing currency). */
  currency: string;
  /** Currency symbol for USD. Display layers convert for the user. */
  currencySymbol: string;
  /** Estimate for every architecture alternative, for comparison. */
  options: OptionCostEstimate[];
  /** The option currently selected in the architecture. */
  selectedOptionId: string;
  /** Catalog version used, so estimates are reproducible/auditable. */
  catalogVersion: string;
  /** Human-readable disclaimer shown in the UI. */
  disclaimer: string;
  /**
   * Customer-budget → USD conversion applied for this report (via
   * CurrencyService). Null when the requirement supplied no usable budget, so
   * no conversion was needed.
   */
  currencyConversion: PricingBudgetConversion | null;
  generatedAt: string;
}
