/**
 * Phase 5 — Proposal Generator Types
 *
 * A ProposalModel is assembled from the outputs of the earlier phases —
 * the Requirement JSON (Phase 2), the selected Architecture (Phase 3), and the
 * Pricing report (Phase 4) — and is presentation-ready for the customer. No new
 * customer input is required to build it.
 */

import type { RequirementModel } from './requirement';
import type { ArchitectureOption, CloudProvider } from './architecture';
import type { PricingEstimate, OptionCostEstimate } from './pricing';

export interface ProposalExecutiveSummary {
  customerName: string;
  businessGoal: string;
  industry: string;
  cloudProvider: CloudProvider;
  architectureName: string;
}

/** A single labelled requirement line for the "Customer Requirements" section. */
export interface ProposalRequirementItem {
  label: string;
  value: string;
}

/** A service card in the "Services Included" section. */
export interface ProposalServiceCard {
  /** Display category (Compute, Database, Storage, …). */
  category: string;
  name: string;
  tier: string;
  provider: CloudProvider;
  /** Why the service was selected (from the architecture rationale). */
  why: string;
  /** The service's role in the overall solution. */
  role: string;
}

/** The "Why This Architecture" professional justification. */
export interface ProposalWhy {
  scalability: string;
  security: string;
  highAvailability: string;
  disasterRecovery: string;
  performance: string;
  costOptimization: string;
}

/** A milestone in the "Next Steps" tracker. */
export interface ProposalNextStep {
  label: string;
  done: boolean;
}

export interface ProposalArchitectureSummary {
  name: string;
  type: string;
  provider: CloudProvider;
  availability: string;
  /** Selected service names. */
  services: string[];
  optionId: string;
  /** Nodes for the existing architecture diagram. */
  visualFlowNodes: ArchitectureOption['visualFlowNodes'];
}

/** The complete, presentation-ready proposal. */
export interface ProposalModel {
  projectId: string;
  generatedAt: string;
  currency: string;
  currencySymbol: string;

  executiveSummary: ProposalExecutiveSummary;
  requirements: ProposalRequirementItem[];
  architecture: ProposalArchitectureSummary;
  services: ProposalServiceCard[];
  why: ProposalWhy;
  benefits: string[];
  assumptions: string[];
  nextSteps: ProposalNextStep[];

  /** Raw phase outputs kept so the existing pricing components can be reused as-is. */
  requirementModel: RequirementModel | null;
  estimate: PricingEstimate;
  selectedOption: OptionCostEstimate;
}
