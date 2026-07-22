/**
 * Cloud Recommendation Engine
 *
 * Evaluates requirement parameters (region, solution type, compliance, existing cloud preference)
 * and computes fit scores (0-100) for Azure, AWS, and GCP with pros, cons, and reasoning.
 *
 * This decouples cloud provider selection from architecture generation.
 */

import type { RequirementModel, CloudRecommendation, CloudProvider } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CloudRecommender');

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
