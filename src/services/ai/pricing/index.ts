/**
 * Pricing service barrel.
 *
 * `estimatePricing` is the single entry point used by the API layer — it hides
 * which estimator (offline catalog vs. future live provider) is active.
 */

import type { ArchitectureModel, RequirementModel, PricingEstimate } from '@/types';
import { getPricingEstimator } from './estimator';

/**
 * Combines the Phase 3 architecture with the Phase 2 requirement to produce a
 * full pricing report (costs + budget analysis + explanation + recommendations).
 */
export function estimatePricing(
  architecture: ArchitectureModel,
  requirement?: RequirementModel | null,
): PricingEstimate {
  return getPricingEstimator().estimate(architecture, requirement);
}

export { getPricingEstimator, catalogEstimator, parseAnchorRangeUsd } from './estimator';
export type { PricingEstimator } from './estimator';
