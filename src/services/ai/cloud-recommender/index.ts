/**
 * Cloud Recommendation Engine
 *
 * Evaluates requirement parameters (region, solution type, compliance, existing cloud preference)
 * and computes fit scores (0-100) for Azure, AWS, and GCP with pros, cons, and reasoning.
 *
 * This decouples cloud provider selection from architecture generation.
 */

import type { RequirementModel, CloudRecommendation, CloudProvider } from '@/types';
import { CATEGORY_BASE_RATES, PROVIDER_MULTIPLIER } from '@/services/ai/pricing/catalog';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CloudRecommender');

// ---------------------------------------------------------------------------
// Merit-based provider recommendation
//
// Separate from evaluateCloudProviders (which applies a "preferred vendor"
// boost). This scores AWS/Azure/GCP purely on their fit for the requirement —
// cost, scalability, availability, security & compliance, and managed-services
// fit — so the AI's recommendation reflects merit, not the customer's stated
// preference. The preference is compared against this, never baked into it.
// ---------------------------------------------------------------------------

const PROVIDERS: CloudProvider[] = ['AWS', 'Azure', 'GCP'];

export interface ProviderDimensionScores {
  cost: number;
  scalability: number;
  availability: number;
  security: number;
  managedFit: number;
}

export interface ProviderEvaluation {
  provider: CloudProvider;
  /** Weighted 0–100 merit score. */
  score: number;
  /** Rough representative monthly estimate (USD) for cost comparison only. */
  monthlyEstimateUsd: number;
  dimensions: ProviderDimensionScores;
}

export interface ProviderRecommendation {
  recommended: CloudProvider;
  recommendedScore: number;
  /** The customer's preferred provider, if one was stated (else null). */
  preferred: CloudProvider | null;
  /** True when the preference is already the best (or within the nag threshold). */
  isPreferredBest: boolean;
  /** All providers, best-first. */
  evaluations: ProviderEvaluation[];
  /** Why the recommendation beats the preference (empty when preferred is best). */
  reasons: string[];
  /** preferredCost − recommendedCost (positive ⇒ recommendation is cheaper), or null. */
  costDifferenceUsd: number | null;
}

const DIMENSION_WEIGHTS: ProviderDimensionScores = {
  cost: 0.22,
  scalability: 0.2,
  availability: 0.2,
  security: 0.22,
  managedFit: 0.16,
};

/** Only surface a recommendation when it beats the preference by at least this. */
const RECOMMENDATION_MARGIN = 3;

/** Map a free-text preferred-cloud value onto a CloudProvider (null if none). */
export function normalizePreferredProvider(value: unknown): CloudProvider | null {
  const s = String(value ?? '').toLowerCase();
  if (!s.trim()) return null;
  if (/aws|amazon/.test(s)) return 'AWS';
  if (/azure|microsoft|az\b/.test(s)) return 'Azure';
  if (/gcp|google/.test(s)) return 'GCP';
  return null;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Cost sub-score derived from the catalog price index (cheaper ⇒ higher). */
function costScore(provider: CloudProvider): number {
  const index = PROVIDER_MULTIPLIER[provider] ?? 1;
  return clamp(Math.round(100 - (index - 0.9) * 120), 40, 100);
}

/** Representative scale multiplier from the larger of users / employees. */
function scaleFactor(req: RequirementModel): number {
  const users = Number(req.users?.value ?? 0) || 0;
  const employees = Number(req.employees?.value ?? 0) || 0;
  const basis = Math.max(users, employees);
  return basis >= 5000 ? 1.3 : basis >= 1000 ? 1.15 : basis >= 300 ? 1.05 : basis > 0 ? 0.95 : 1;
}

function evaluateProvider(provider: CloudProvider, req: RequirementModel): ProviderEvaluation {
  const region = String(req.region?.value ?? '').toLowerCase();
  const solutionType = String(req.solutionType?.value ?? '').toLowerCase();
  const availability = String(req.availability?.value ?? '').toLowerCase();
  const compliancePresent = Array.isArray(req.compliance?.value) && req.compliance.value.length > 0;

  // Baseline dimension scores per provider (industry-fit heuristics).
  const base: Record<CloudProvider, ProviderDimensionScores> = {
    AWS: { cost: costScore('AWS'), scalability: 95, availability: 93, security: 88, managedFit: 88 },
    Azure: { cost: costScore('Azure'), scalability: 88, availability: 91, security: 92, managedFit: 90 },
    GCP: { cost: costScore('GCP'), scalability: 90, availability: 88, security: 86, managedFit: 84 },
  };
  const d = { ...base[provider] };

  // Requirement-driven adjustments.
  if (/india/.test(region) && (provider === 'AWS' || provider === 'Azure')) d.availability += 3;
  if (/erp|enterprise|crm/.test(solutionType) && provider === 'Azure') { d.managedFit += 8; d.security += 3; }
  if (/data lake|analytics|\bml\b|machine learning/.test(solutionType) && provider === 'GCP') { d.managedFit += 10; d.scalability += 4; }
  if (/banking|e-?commerce|fintech|financial/.test(solutionType) && provider === 'AWS') { d.scalability += 6; d.availability += 5; }
  if (compliancePresent) d.security += provider === 'Azure' ? 6 : provider === 'AWS' ? 4 : 2;
  if (/99\.99|high availability|multi-?region|active-active/.test(availability)) {
    d.availability += provider === 'AWS' ? 4 : provider === 'Azure' ? 3 : 2;
  }
  const scale = scaleFactor(req);
  if (scale >= 1.15) d.scalability += provider === 'AWS' ? 4 : provider === 'GCP' ? 3 : 2;

  // Clamp all dimensions and compute the weighted score.
  (Object.keys(d) as (keyof ProviderDimensionScores)[]).forEach((k) => (d[k] = clamp(d[k], 40, 100)));
  const score = Math.round(
    d.cost * DIMENSION_WEIGHTS.cost +
      d.scalability * DIMENSION_WEIGHTS.scalability +
      d.availability * DIMENSION_WEIGHTS.availability +
      d.security * DIMENSION_WEIGHTS.security +
      d.managedFit * DIMENSION_WEIGHTS.managedFit,
  );

  const baseline = Object.values(CATEGORY_BASE_RATES).reduce((a, b) => a + b, 0);
  const monthlyEstimateUsd = Math.round(baseline * (PROVIDER_MULTIPLIER[provider] ?? 1) * scale);

  return { provider, score, monthlyEstimateUsd, dimensions: d };
}

const DIMENSION_LABELS: Record<keyof ProviderDimensionScores, string> = {
  cost: 'lower estimated cost',
  scalability: 'stronger scalability',
  availability: 'higher availability & resilience',
  security: 'better security & compliance fit',
  managedFit: 'a closer managed-services fit',
};

/**
 * Evaluate all three providers on merit and compare the best against the
 * customer's stated preference.
 */
export function recommendProvider(req: RequirementModel): ProviderRecommendation {
  const evaluations = PROVIDERS.map((p) => evaluateProvider(p, req)).sort((a, b) => b.score - a.score);
  const top = evaluations[0];
  const preferred = normalizePreferredProvider(req.cloudProvider?.value);

  const preferredEval = preferred ? evaluations.find((e) => e.provider === preferred) ?? null : null;
  // Treat the preference as "best" when it is the top pick or essentially tied.
  const isPreferredBest =
    preferred !== null && (preferred === top.provider || (preferredEval != null && top.score - preferredEval.score < RECOMMENDATION_MARGIN));

  const recommended = isPreferredBest && preferred ? preferred : top.provider;
  const recommendedEval = evaluations.find((e) => e.provider === recommended)!;

  // Reasons the recommendation beats the preference (only when they differ).
  const reasons: string[] = [];
  let costDifferenceUsd: number | null = null;
  if (!isPreferredBest && preferredEval) {
    (Object.keys(DIMENSION_LABELS) as (keyof ProviderDimensionScores)[]).forEach((k) => {
      if (recommendedEval.dimensions[k] - preferredEval.dimensions[k] >= 3) {
        reasons.push(DIMENSION_LABELS[k]);
      }
    });
    costDifferenceUsd = preferredEval.monthlyEstimateUsd - recommendedEval.monthlyEstimateUsd;
  }

  logger.info('Provider recommendation computed', {
    recommended,
    recommendedScore: recommendedEval.score,
    preferred,
    isPreferredBest,
  });

  return {
    recommended,
    recommendedScore: recommendedEval.score,
    preferred,
    isPreferredBest,
    evaluations,
    reasons,
    costDifferenceUsd,
  };
}

export function evaluateCloudProviders(req: RequirementModel): CloudRecommendation[] {
  const preferredCloud = (req.cloudProvider?.value ?? '').toString().toLowerCase();
  const region = (req.region?.value ?? '').toString().toLowerCase();
  const solutionType = (req.solutionType?.value ?? '').toString().toLowerCase();
  const compliance = Array.isArray(req.compliance?.value)
    ? req.compliance.value.map((c) => String(c).toLowerCase())
    : [];

  let azureScore = 75;
  let awsScore = 75;
  let gcpScore = 70;

  const azurePros: string[] = ['Native Enterprise Active Directory & Office 365 integration', 'Strong PaaS SQL & App Service offerings'];
  const azureCons: string[] = [];

  const awsPros: string[] = ['Deepest service portfolio & global infrastructure footprint', 'Industry benchmark for multi-region active-active architectures'];
  const awsCons: string[] = [];

  const gcpPros: string[] = ['Leading data analytics, BigQuery & Kubernetes (GKE) capabilities', 'Cost-effective auto-scaling serverless primitives'];
  const gcpCons: string[] = [];

  // Preference boost
  if (preferredCloud.includes('azure') || preferredCloud.includes('microsoft')) {
    azureScore += 20;
    azurePros.unshift('Directly aligns with customer preferred cloud vendor (Azure)');
  } else if (preferredCloud.includes('aws') || preferredCloud.includes('amazon')) {
    awsScore += 20;
    awsPros.unshift('Directly aligns with customer preferred cloud vendor (AWS)');
  } else if (preferredCloud.includes('gcp') || preferredCloud.includes('google')) {
    gcpScore += 20;
    gcpPros.unshift('Directly aligns with customer preferred cloud vendor (GCP)');
  }

  // Region evaluation
  if (region.includes('india')) {
    azureScore += 5; // Azure India Central / South / West
    awsScore += 5;   // AWS Mumbai / Hyderabad
    azurePros.push('Local India datacenter regions (Mumbai, Pune, Chennai)');
    awsPros.push('Dual India AWS Regions (ap-south-1 Mumbai, ap-south-2 Hyderabad)');
  }

  // Workload evaluation
  if (solutionType.includes('erp') || solutionType.includes('crm') || solutionType.includes('enterprise')) {
    azureScore += 10;
    azurePros.push('Proven enterprise ERP deployment blueprints (SAP / Dynamics / Custom .NET / SQL)');
  } else if (solutionType.includes('data lake') || solutionType.includes('analytics')) {
    gcpScore += 15;
    gcpPros.push('Optimized for analytical data lakes via BigQuery & Dataproc');
  } else if (solutionType.includes('banking') || solutionType.includes('e-commerce')) {
    awsScore += 10;
    awsPros.push('High-concurrency retail and financial transaction engines');
  }

  // Normalize scores to max 98
  azureScore = Math.min(98, Math.max(50, azureScore));
  awsScore = Math.min(98, Math.max(50, awsScore));
  gcpScore = Math.min(98, Math.max(50, gcpScore));

  const recommendations: CloudRecommendation[] = [
    {
      provider: 'Azure',
      score: azureScore,
      pros: azurePros,
      cons: azureCons.length ? azureCons : ['Requires enterprise agreement for maximum discount tiers'],
      fitReasoning: `Azure achieves a ${azureScore}% fit rating for ${req.company?.value || 'this organization'} based on enterprise workload profile, SQL compatibility, and compliance defaults.`,
    },
    {
      provider: 'AWS',
      score: awsScore,
      pros: awsPros,
      cons: awsCons.length ? awsCons : ['Higher egress network bandwidth rates for multi-cloud setups'],
      fitReasoning: `AWS achieves a ${awsScore}% fit rating offering maximum architectural flexibility, multi-AZ resilience, and extensive global service coverage.`,
    },
    {
      provider: 'GCP',
      score: gcpScore,
      pros: gcpPros,
      cons: gcpCons.length ? gcpCons : ['Smaller enterprise ecosystem footprint compared to AWS/Azure for ERPs'],
      fitReasoning: `GCP achieves a ${gcpScore}% fit rating with strong containerized compute and cost-efficient analytics capabilities.`,
    },
  ];

  recommendations.sort((a, b) => b.score - a.score);
  logger.info('Cloud recommendations evaluated', { topProvider: recommendations[0].provider, score: recommendations[0].score });

  return recommendations;
}
