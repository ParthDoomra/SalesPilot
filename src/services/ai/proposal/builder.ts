/**
 * Proposal Builder (offline, deterministic).
 *
 * Assembles a presentation-ready ProposalModel from the three prior phases:
 *   • Requirement JSON  (Phase 2) — the customer's business & technical needs.
 *   • Selected Architecture (Phase 3) — the recommended cloud solution.
 *   • Pricing report (Phase 4) — cost estimate + budget analysis.
 *
 * The narrative sections (executive summary, "why this architecture", benefits,
 * assumptions) are generated from these inputs with templated, professional
 * copy — no LLM call and no new customer input. It is kept behind a single
 * `buildProposal` entry point so a live/LLM generator can be swapped in later
 * without touching the API or UI.
 */

import type {
  ArchitectureModel,
  ArchitectureOption,
  CloudServiceNode,
  RequirementModel,
  PricingEstimate,
  OptionCostEstimate,
  ProposalModel,
  ProposalRequirementItem,
  ProposalServiceCard,
  ProposalWhy,
  ProposalNextStep,
} from '@/types';

// ---------------------------------------------------------------------------
// Requirement field access
// ---------------------------------------------------------------------------

function fieldValue<T = unknown>(req: RequirementModel | null | undefined, key: keyof RequirementModel): T | null {
  if (!req) return null;
  const f = req[key] as unknown as { value?: T } | undefined;
  return (f && typeof f === 'object' && 'value' in f ? (f.value ?? null) : null) as T | null;
}

const str = (v: unknown): string => (v === null || v === undefined || v === '' ? '' : String(v));
const orDash = (v: string): string => (v ? v : '—');

// ---------------------------------------------------------------------------
// Role copy per service category — the service's role in the solution
// ---------------------------------------------------------------------------

const CATEGORY_ROLE: Record<string, string> = {
  Compute: 'Runs the application workloads and business logic.',
  Database: 'Stores and serves the solution’s transactional and application data.',
  Storage: 'Persists files, backups, and unstructured data.',
  Networking: 'Connects and routes traffic securely between components.',
  Security: 'Protects identities, secrets, and data access across the solution.',
  Management: 'Provides observability, logging, and operational alerting.',
  'Backup & DR': 'Provides data protection, backups, and recovery points.',
};

const CATEGORY_DISPLAY: Record<string, string> = {
  Management: 'Monitoring',
  'Backup & DR': 'Backup',
};

function serviceCard(svc: CloudServiceNode): ProposalServiceCard {
  return {
    category: CATEGORY_DISPLAY[svc.category] ?? svc.category,
    name: svc.name,
    tier: svc.tier,
    provider: svc.provider,
    why: svc.reason,
    role: CATEGORY_ROLE[svc.category] ?? 'Supports the overall cloud solution.',
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildRequirements(req: RequirementModel | null, currencySymbol: string): ProposalRequirementItem[] {
  const compliance = fieldValue<string[]>(req, 'compliance');
  const budget = fieldValue<number>(req, 'budget');
  const currency = str(fieldValue<string>(req, 'budgetCurrency')) || 'USD';
  const period = str(fieldValue<string>(req, 'budgetPeriod')) || 'monthly';

  const items: ProposalRequirementItem[] = [
    { label: 'Company', value: orDash(str(fieldValue(req, 'company'))) },
    { label: 'Industry', value: orDash(str(fieldValue(req, 'industry'))) },
    { label: 'Employees', value: orDash(str(fieldValue<number>(req, 'employees'))) },
    { label: 'Users', value: orDash(str(fieldValue<number>(req, 'users'))) },
    { label: 'Region', value: orDash(str(fieldValue(req, 'region'))) },
    {
      label: 'Budget',
      value: budget ? `${currencySymbol}${Number(budget).toLocaleString()} / ${period}` : '—',
    },
    { label: 'Currency', value: currency },
    {
      label: 'Compliance',
      value: Array.isArray(compliance) && compliance.length ? compliance.join(', ') : '—',
    },
    { label: 'Security', value: orDash(str(fieldValue(req, 'security'))) },
    { label: 'Availability', value: orDash(str(fieldValue(req, 'availability'))) },
    { label: 'Disaster Recovery', value: orDash(str(fieldValue(req, 'disasterRecovery'))) },
    { label: 'Database', value: orDash(str(fieldValue(req, 'database'))) },
    { label: 'Storage', value: orDash(str(fieldValue(req, 'storage'))) },
    { label: 'Networking', value: orDash(str(fieldValue(req, 'networking'))) },
  ];
  return items;
}

function buildWhy(
  option: ArchitectureOption,
  req: RequirementModel | null,
  provider: string,
  budgetStatusWithin: boolean,
): ProposalWhy {
  const availability = str(fieldValue(req, 'availability')) || 'the target availability level';
  const dr = str(fieldValue(req, 'disasterRecovery'));
  const compliance = fieldValue<string[]>(req, 'compliance');
  const complianceText = Array.isArray(compliance) && compliance.length ? compliance.join(', ') : 'industry-standard';
  const typeWord = option.type;

  return {
    scalability: `The ${typeWord} design on ${provider} scales elastically — compute and data tiers can grow with user demand without re-architecting, protecting the investment as the business expands.`,
    security: `Security is enforced in depth: managed identity, encryption in transit and at rest, and ${complianceText} controls address the customer's security and compliance requirements.`,
    highAvailability: `The architecture targets ${availability}, using redundant, managed services so the solution stays available during maintenance and component failures.`,
    disasterRecovery: dr
      ? `Disaster recovery follows the stated strategy (${dr}) with backups and recovery points that limit data loss and downtime.`
      : `Automated backups and recoverable managed data services provide a solid disaster-recovery baseline that can be extended to multi-region as needs grow.`,
    performance: `${provider} managed services and a ${typeWord} resource profile deliver responsive performance for the expected user load while avoiding over-provisioning.`,
    costOptimization: budgetStatusWithin
      ? `The solution is right-sized to stay within the customer's budget, and can be further optimized with reserved/committed-use pricing.`
      : `Cost is controlled through right-sizing and managed services; the pricing report includes concrete optimizations (reserved pricing, tier right-sizing) to align spend with the budget.`,
  };
}

function buildBenefits(): string[] {
  return [
    'Fully Managed',
    'High Availability',
    'Secure',
    'Scalable',
    'Cost Optimized',
    'Disaster Recovery Ready',
  ];
}

function buildAssumptions(
  req: RequirementModel | null,
  estimate: PricingEstimate,
  option: OptionCostEstimate,
): string[] {
  const assumptions: string[] = [];
  assumptions.push(
    `Costs are AI-generated estimates in ${estimate.currency} derived from an offline pricing catalog, the selected architecture, and the customer requirement — not live ${estimate.provider} pricing.`,
  );

  if (!fieldValue<number>(req, 'budget')) {
    assumptions.push('No customer budget was captured, so budget comparison is omitted; figures assume standard on-demand pricing.');
  }
  if (!fieldValue<number>(req, 'users')) {
    assumptions.push('Concurrent user count was not specified; a standard baseline load was assumed for sizing.');
  }
  if (!str(fieldValue(req, 'disasterRecovery'))) {
    assumptions.push('No explicit disaster-recovery target was provided; a single-region backup baseline is assumed.');
  }
  assumptions.push('A single production environment is assumed (non-production environments would add incremental cost).');
  assumptions.push('Estimates assume standard business-hours operations and typical data-transfer volumes for the workload.');
  assumptions.push(`Confidence in the estimate is approximately ${option.confidence}% based on the available requirement detail.`);
  return assumptions;
}

function buildNextSteps(): ProposalNextStep[] {
  return [
    { label: 'Discovery Completed', done: true },
    { label: 'Requirements Validated', done: true },
    { label: 'Architecture Approved', done: true },
    { label: 'Pricing Estimated', done: true },
    { label: 'Ready for Implementation', done: false },
  ];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface BuildProposalInput {
  architecture: ArchitectureModel;
  requirement: RequirementModel | null;
  estimate: PricingEstimate;
  /** Fallback customer name when the requirement has no company captured. */
  customerName?: string;
}

export function buildProposal({ architecture, requirement, estimate, customerName }: BuildProposalInput): ProposalModel {
  const option =
    architecture.options.find((o) => o.id === architecture.selectedOptionId) ?? architecture.options[0];
  const selectedOption =
    estimate.options.find((o) => o.optionId === option.id) ?? estimate.options[0];

  const provider = architecture.selectedProvider;
  const industry = str(fieldValue(requirement, 'industry'));
  const solutionType = str(fieldValue(requirement, 'solutionType'));
  const availability = str(fieldValue(requirement, 'availability')) || 'Standard availability';
  const company = str(fieldValue(requirement, 'company'));

  const budgetWithin = selectedOption.budgetAnalysis.status !== 'over';

  return {
    projectId: architecture.projectId,
    generatedAt: new Date().toISOString(),
    currency: estimate.currency,
    currencySymbol: estimate.currencySymbol,

    executiveSummary: {
      customerName: company || customerName || 'the customer',
      businessGoal: solutionType
        ? `Deliver a ${solutionType} solution on the cloud`
        : 'Deliver a scalable, secure cloud solution aligned to the business requirements',
      industry: industry || '—',
      cloudProvider: provider,
      architectureName: option.name,
    },

    requirements: buildRequirements(requirement, estimate.currencySymbol),

    architecture: {
      name: option.name,
      type: option.type,
      provider,
      availability,
      services: option.services.map((s) => s.name),
      optionId: option.id,
      visualFlowNodes: option.visualFlowNodes,
    },

    services: option.services.map(serviceCard),

    why: buildWhy(option, requirement, provider, budgetWithin),
    benefits: buildBenefits(),
    assumptions: buildAssumptions(requirement, estimate, selectedOption),
    nextSteps: buildNextSteps(),

    requirementModel: requirement,
    estimate,
    selectedOption,
  };
}
