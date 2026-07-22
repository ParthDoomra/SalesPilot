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
  /** Estimated monthly cost in the estimate currency. */
  monthlyCost: number;
  /** Estimated yearly cost in the estimate currency. */
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

/** Compares an option's estimated cost against the customer's stated budget. */
export interface BudgetAnalysis {
  /** Whether the requirement supplied a usable budget. */
  hasBudget: boolean;
  /** Budget as stated by the customer (their currency & period). */
  customerBudget: number | null;
  customerCurrency: string;
  customerCurrencySymbol: string;
  budgetPeriod: string;
  /** Budget normalised to the estimate currency (USD), per month / year. */
  budgetMonthly: number | null;
  budgetAnnual: number | null;
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  /** budgetMonthly − estimatedMonthly (positive = under budget). */
  differenceMonthly: number | null;
  differenceAnnual: number | null;
  /** estimatedMonthly / budgetMonthly × 100. */
  utilizationPercent: number | null;
  status: BudgetStatus;
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

/** The complete pricing estimate for a project's architecture. */
export interface PricingEstimate {
  id: string;
  projectId: string;
  architectureId: string;
  provider: CloudProvider;
  /** ISO currency code the numbers are expressed in (currently always USD). */
  currency: string;
  /** Currency symbol for display. */
  currencySymbol: string;
  /** Estimate for every architecture alternative, for comparison. */
  options: OptionCostEstimate[];
  /** The option currently selected in the architecture. */
  selectedOptionId: string;
  /** Catalog version used, so estimates are reproducible/auditable. */
  catalogVersion: string;
  /** Human-readable disclaimer shown in the UI. */
  disclaimer: string;
  generatedAt: string;
}
