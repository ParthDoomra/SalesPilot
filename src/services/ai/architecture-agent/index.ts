/**
 * Architecture Agent
 *
 * Orchestrates:
 * 1. Cloud Recommendation Engine (evaluates Azure/AWS/GCP fit scores)
 * 2. Cloud Decision Engine (evaluates scale/tier/DR rules & compatibility warnings)
 * 3. LLM Service (generates 3 architecture options: Performance, Balanced, Budget)
 * 4. Architecture Parser (transforms LLM response into typed ArchitectureModel)
 */

import type { ArchitectureModel, RequirementModel, CloudProvider, ArchitectureOption } from '@/types';
import { evaluateCloudProviders } from '../cloud-recommender';
import { evaluateDecisions } from '../decision-engine';
import { llm } from '../llm-service';
import { buildArchitectureSystemPrompt } from '../prompt-engine/architecture-generation';
import { parseArchitectureResponse } from '../parser/architecture-parser';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ArchitectureAgent');

export interface GenerateArchitectureInput {
  projectId: string;
  requirement: RequirementModel;
  providerOverride?: CloudProvider;
}

export async function generateArchitecture(
  input: GenerateArchitectureInput,
): Promise<ArchitectureModel> {
  const start = Date.now();
  logger.info('Generating architecture', { projectId: input.projectId });

  // 1. Run Cloud Recommendation Engine
  const recommendations = evaluateCloudProviders(input.requirement);
  const selectedProvider = input.providerOverride || recommendations[0].provider;
  const topRec = recommendations.find((r) => r.provider === selectedProvider) || recommendations[0];

  // 2. Run Decision Engine
  const decisionResult = evaluateDecisions(input.requirement);

  const decisionRulesSummary = `
- Recommended Tier: ${decisionResult.recommendedTier}
- Requires DR: ${decisionResult.requiresDR}
- Requires High Availability: ${decisionResult.requiresHighAvailability}
- Scale Decision: ${decisionResult.decisionLogs.map((d) => d.decision).join('; ')}
  `.trim();

  const reqSimpleJson = JSON.stringify(
    {
      company: input.requirement.company?.value,
      industry: input.requirement.industry?.value,
      users: input.requirement.users?.value,
      employees: input.requirement.employees?.value,
      region: input.requirement.region?.value,
      budget: input.requirement.budget?.value,
      solutionType: input.requirement.solutionType?.value,
      cloudProvider: input.requirement.cloudProvider?.value,
      database: input.requirement.database?.value,
      disasterRecovery: input.requirement.disasterRecovery?.value,
      backup: input.requirement.backup?.value,
      availability: input.requirement.availability?.value,
      compliance: input.requirement.compliance?.value,
      security: input.requirement.security?.value,
    },
    null,
    2,
  );

  // 3. Call LLM Service
  let options: ArchitectureOption[] | null = null;
  try {
    const prompt = buildArchitectureSystemPrompt(
      selectedProvider,
      reqSimpleJson,
      topRec.fitReasoning,
      decisionRulesSummary,
    );

    const result = await llm.complete('Generate 3 cloud architecture options for this requirement.', {
      systemPrompt: prompt,
      temperature: 0.2,
      maxTokens: 3000,
    });

    options = parseArchitectureResponse(result.content, selectedProvider);
  } catch (err) {
    logger.warn('LLM architecture generation failed, generating fallback options', { error: String(err) });
  }

  // 4. Fallback if LLM parsing failed or mock provider was used without full JSON
  if (!options || options.length === 0) {
    options = generateFallbackArchitectureOptions(selectedProvider, input.requirement, decisionResult.recommendedTier);
  }

  const architectureId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const architectureModel: ArchitectureModel = {
    id: architectureId,
    projectId: input.projectId,
    requirementId: input.requirement.id,
    selectedProvider,
    selectedOptionId: options.find((o) => o.type === 'balanced')?.id || options[0].id,
    options,
    recommendations,
    compatibilityWarnings: decisionResult.warnings,
    decisionLogs: decisionResult.decisionLogs,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  logger.info('Architecture generated successfully', {
    projectId: input.projectId,
    selectedProvider,
    optionsCount: options.length,
    latencyMs: Date.now() - start,
  });

  return architectureModel;
}

// ---------------------------------------------------------------------------
// Fallback Architecture Option Generator
// ---------------------------------------------------------------------------

function generateFallbackArchitectureOptions(
  provider: CloudProvider,
  req: RequirementModel,
  tier: string,
): ArchitectureOption[] {
  const isAzure = provider === 'Azure';
  const isAWS = provider === 'AWS';

  const company = req.company?.value || 'Enterprise';
  const solution = req.solutionType?.value || 'Solution';

  // Option A — Performance
  const optionA: ArchitectureOption = {
    id: 'opt_perf',
    name: `${company} ${solution} — Performance & High Resilience`,
    type: 'performance',
    starRating: 5,
    badgeText: 'Maximum Resilience',
    costEstimateRange: req.budgetCurrency?.value === 'INR' ? '₹3,20,000 - ₹3,80,000 / mo' : '$3,800 - $4,500 / mo',
    confidence: 96,
    description: `Multi-region active-active deployment with zone-redundant ${isAzure ? 'Azure SQL' : isAWS ? 'Amazon Aurora' : 'Cloud SQL'} and automated cross-region failover.`,
    recommendationReason: 'Ideal for mission-critical enterprise workloads requiring 99.99% uptime SLAs and active-active failover.',
    services: [
      {
        id: 'srv_1',
        name: isAzure ? 'Azure Front Door' : isAWS ? 'Amazon CloudFront & ALB' : 'Cloud CDN & Load Balancing',
        provider,
        category: 'Networking',
        tier: 'Premium / WAF Enabled',
        reason: 'Global entry point providing SSL offloading, web application firewall (WAF), and instant global failover routing.',
        confidence: 96,
        estimatedMonthlyCostRange: '$350 - $500',
      },
      {
        id: 'srv_2',
        name: isAzure ? 'Azure App Service (P2v3)' : isAWS ? 'AWS ECS / Fargate (2xlarge)' : 'Google Cloud Run / GKE',
        provider,
        category: 'Compute',
        tier: `${tier} High Density`,
        reason: 'Auto-scaling compute cluster spanning 3 Availability Zones to ensure zero downtime during peak traffic.',
        confidence: 95,
        estimatedMonthlyCostRange: '$1,200 - $1,600',
      },
      {
        id: 'srv_3',
        name: isAzure ? 'Azure SQL Database (Business Critical)' : isAWS ? 'Amazon Aurora PostgreSQL (Multi-AZ)' : 'Cloud SQL Enterprise Plus',
        provider,
        category: 'Database',
        tier: 'Business Critical Multi-AZ',
        reason: 'Managed relational database with active-active read replicas and 99.99% uptime guarantee.',
        confidence: 96,
        estimatedMonthlyCostRange: '$1,400 - $1,800',
      },
      {
        id: 'srv_4',
        name: isAzure ? 'Azure Blob Storage (GRS)' : isAWS ? 'Amazon S3 (Cross-Region Replication)' : 'Google Cloud Storage (Multi-Region)',
        provider,
        category: 'Storage',
        tier: 'Geo-Redundant (GRS)',
        reason: 'High-durability storage replicated automatically to a secondary geographic region.',
        confidence: 94,
        estimatedMonthlyCostRange: '$200 - $350',
      },
      {
        id: 'srv_5',
        name: isAzure ? 'Azure Site Recovery & Azure Backup' : isAWS ? 'AWS Backup & Elastic Disaster Recovery' : 'Google Cloud Backup & DR',
        provider,
        category: 'Backup & DR',
        tier: 'Enterprise Continuous PITR',
        reason: 'Automated 15-minute Recovery Point Objective (RPO) with 1-click disaster recovery orchestration.',
        confidence: 95,
        estimatedMonthlyCostRange: '$250 - $400',
      },
      {
        id: 'srv_6',
        name: isAzure ? 'Azure Key Vault & Azure Firewall' : isAWS ? 'AWS KMS & Network Firewall' : 'Cloud Key Management & Cloud Armor',
        provider,
        category: 'Security',
        tier: 'Enterprise KMS & HSM',
        reason: 'Hardware Security Module (HSM) backed encryption key management with zero trust network inspection.',
        confidence: 96,
        estimatedMonthlyCostRange: '$300 - $450',
      },
    ],
    visualFlowNodes: [
      { id: 'f1', label: 'Global Traffic Entry', category: 'Networking', serviceName: isAzure ? 'Front Door' : 'CloudFront', connectedTo: ['f2'] },
      { id: 'f2', label: 'App Compute Cluster', category: 'Compute', serviceName: isAzure ? 'App Service (P2v3)' : 'AWS ECS', connectedTo: ['f3', 'f4'] },
      { id: 'f3', label: 'Multi-AZ Database', category: 'Database', serviceName: isAzure ? 'Azure SQL (Multi-AZ)' : 'Amazon Aurora', connectedTo: ['f5'] },
      { id: 'f4', label: 'Geo-Replicated Storage', category: 'Storage', serviceName: isAzure ? 'Blob Storage (GRS)' : 'Amazon S3' },
      { id: 'f5', label: 'Disaster Recovery Vault', category: 'Backup & DR', serviceName: isAzure ? 'Site Recovery' : 'AWS Backup' },
    ],
  };

  // Option B — Balanced (Recommended)
  const optionB: ArchitectureOption = {
    id: 'opt_bal',
    name: `${company} ${solution} — Balanced PaaS Architecture (Recommended)`,
    type: 'balanced',
    starRating: 4,
    badgeText: 'Recommended',
    costEstimateRange: req.budgetCurrency?.value === 'INR' ? '₹2,40,000 - ₹2,90,000 / mo' : '$2,800 - $3,400 / mo',
    confidence: 94,
    description: `Zone-redundant PaaS deployment balancing high availability (99.9%), managed operations, and optimal cost.`,
    recommendationReason: 'Best overall choice: delivers production high availability with minimal administrative overhead.',
    services: [
      {
        id: 'srv_b1',
        name: isAzure ? 'Azure Application Gateway (WAF v2)' : isAWS ? 'AWS Application Load Balancer' : 'Cloud Load Balancing',
        provider,
        category: 'Networking',
        tier: 'Standard v2',
        reason: 'Layer 7 load balancing with SSL termination and integrated URL path routing.',
        confidence: 94,
        estimatedMonthlyCostRange: '$180 - $280',
      },
      {
        id: 'srv_b2',
        name: isAzure ? 'Azure App Service (P1v3)' : isAWS ? 'AWS Elastic Beanstalk / ECS' : 'Google Cloud Run',
        provider,
        category: 'Compute',
        tier: 'PaaS Production Tier',
        reason: 'Fully managed web compute auto-scaling dynamically based on CPU and request latency.',
        confidence: 95,
        estimatedMonthlyCostRange: '$800 - $1,100',
      },
      {
        id: 'srv_b3',
        name: isAzure ? 'Azure SQL Database (General Purpose Multi-AZ)' : isAWS ? 'Amazon RDS PostgreSQL (Multi-AZ)' : 'Cloud SQL PostgreSQL',
        provider,
        category: 'Database',
        tier: 'General Purpose Multi-AZ',
        reason: 'Managed PostgreSQL/SQL with automated zone failover and daily backups.',
        confidence: 95,
        estimatedMonthlyCostRange: '$900 - $1,200',
      },
      {
        id: 'srv_b4',
        name: isAzure ? 'Azure Blob Storage (ZRS)' : isAWS ? 'Amazon S3 Standard' : 'Google Cloud Storage',
        provider,
        category: 'Storage',
        tier: 'Zone-Redundant Storage (ZRS)',
        reason: 'Synchronously replicated object storage across 3 availability zones in the primary region.',
        confidence: 94,
        estimatedMonthlyCostRange: '$120 - $220',
      },
      {
        id: 'srv_b5',
        name: isAzure ? 'Azure Backup' : isAWS ? 'AWS Backup' : 'Cloud Backup',
        provider,
        category: 'Backup & DR',
        tier: 'Automated Snapshot Vault',
        reason: 'Daily automated snapshots retained for 30 days with point-in-time restore.',
        confidence: 93,
        estimatedMonthlyCostRange: '$100 - $180',
      },
      {
        id: 'srv_b6',
        name: isAzure ? 'Azure Key Vault & Monitor' : isAWS ? 'AWS KMS & CloudWatch' : 'Cloud KMS & Operations',
        provider,
        category: 'Security',
        tier: 'Standard PaaS Security',
        reason: 'Centralized secret management, TLS certificate auto-renewal, and metric alerting.',
        confidence: 94,
        estimatedMonthlyCostRange: '$150 - $220',
      },
    ],
    visualFlowNodes: [
      { id: 'fb1', label: 'Application Gateway', category: 'Networking', serviceName: isAzure ? 'App Gateway (WAF)' : 'ALB', connectedTo: ['fb2'] },
      { id: 'fb2', label: 'Managed App Compute', category: 'Compute', serviceName: isAzure ? 'App Service (P1v3)' : 'AWS ECS', connectedTo: ['fb3', 'fb4'] },
      { id: 'fb3', label: 'Managed Database', category: 'Database', serviceName: isAzure ? 'Azure SQL (GP)' : 'Amazon RDS', connectedTo: ['fb5'] },
      { id: 'fb4', label: 'Object Storage', category: 'Storage', serviceName: isAzure ? 'Blob Storage (ZRS)' : 'Amazon S3' },
      { id: 'fb5', label: 'Backup Vault', category: 'Backup & DR', serviceName: isAzure ? 'Azure Backup' : 'AWS Backup' },
    ],
  };

  // Option C — Budget
  const optionC: ArchitectureOption = {
    id: 'opt_budg',
    name: `${company} ${solution} — Cost-Optimized Serverless Architecture`,
    type: 'budget',
    starRating: 3,
    badgeText: 'Lowest Cost',
    costEstimateRange: req.budgetCurrency?.value === 'INR' ? '₹1,80,000 - ₹2,20,000 / mo' : '$1,800 - $2,300 / mo',
    confidence: 90,
    description: `Cost-optimized deployment using burstable compute and auto-pausing serverless database tiers to minimize idle costs.`,
    recommendationReason: 'Best choice for strict budget constraints or early-stage deployment before traffic spikes.',
    services: [
      {
        id: 'srv_c1',
        name: isAzure ? 'Azure App Service (B2 Burstable)' : isAWS ? 'AWS Elastic Beanstalk (t4g.medium)' : 'Google Cloud Run',
        provider,
        category: 'Compute',
        tier: 'Burstable Tier',
        reason: 'Cost-effective compute with CPU credit accumulation during low-traffic periods.',
        confidence: 91,
        estimatedMonthlyCostRange: '$500 - $750',
      },
      {
        id: 'srv_c2',
        name: isAzure ? 'Azure SQL Serverless' : isAWS ? 'Amazon Aurora Serverless v2' : 'Cloud SQL Burstable',
        provider,
        category: 'Database',
        tier: 'Serverless Auto-Pause',
        reason: 'Database compute scales automatically with active queries and scales to minimum vCPU when idle.',
        confidence: 90,
        estimatedMonthlyCostRange: '$600 - $900',
      },
      {
        id: 'srv_c3',
        name: isAzure ? 'Azure Blob Storage (LRS)' : isAWS ? 'Amazon S3 Standard-IA' : 'Google Cloud Storage Standard',
        provider,
        category: 'Storage',
        tier: 'Locally Redundant (LRS)',
        reason: 'Locally replicated storage in a single datacenter for lowest per-GB storage pricing.',
        confidence: 90,
        estimatedMonthlyCostRange: '$80 - $140',
      },
      {
        id: 'srv_c4',
        name: isAzure ? 'Azure Backup (Standard)' : isAWS ? 'AWS Backup (Standard)' : 'Cloud Backup',
        provider,
        category: 'Backup & DR',
        tier: 'Standard Backup',
        reason: 'Weekly snapshots with 14-day retention to meet basic compliance.',
        confidence: 88,
        estimatedMonthlyCostRange: '$60 - $110',
      },
    ],
    visualFlowNodes: [
      { id: 'fc1', label: 'Burstable App Compute', category: 'Compute', serviceName: isAzure ? 'App Service (B2)' : 't4g.medium', connectedTo: ['fc2', 'fc3'] },
      { id: 'fc2', label: 'Serverless DB', category: 'Database', serviceName: isAzure ? 'Azure SQL Serverless' : 'Aurora Serverless', connectedTo: ['fc4'] },
      { id: 'fc3', label: 'Local Object Storage', category: 'Storage', serviceName: isAzure ? 'Blob Storage (LRS)' : 'Amazon S3 IA' },
      { id: 'fc4', label: 'Snapshot Backup', category: 'Backup & DR', serviceName: isAzure ? 'Azure Backup' : 'AWS Backup' },
    ],
  };

  return [optionB, optionA, optionC]; // Balanced first
}
