/**
 * Cloud Decision Engine
 *
 * Rule-based presales decision engine that:
 * 1. Evaluates workload scale rules (e.g. users > 1000 -> Premium Tiers)
 * 2. Evaluates DR & Backup additions
 * 3. Detects compatibility warnings (e.g. Budget < required compute/DR)
 * 4. Produces structured decision logs for transparency.
 */

import type { RequirementModel, CompatibilityWarning, DecisionLog } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CloudDecisionEngine');

export interface DecisionEngineResult {
  warnings: CompatibilityWarning[];
  decisionLogs: DecisionLog[];
  recommendedTier: 'Standard' | 'Premium' | 'Enterprise';
  requiresDR: boolean;
  requiresBackup: boolean;
  requiresHighAvailability: boolean;
}

export function evaluateDecisions(req: RequirementModel): DecisionEngineResult {
  const warnings: CompatibilityWarning[] = [];
  const decisionLogs: DecisionLog[] = [];
  const now = new Date().toISOString();

  const users = typeof req.users?.value === 'number' ? req.users.value : 0;
  const employees = typeof req.employees?.value === 'number' ? req.employees.value : 0;
  const budget = typeof req.budget?.value === 'number' ? req.budget.value : 0;

  const availabilityText = (req.availability?.value ?? '').toString().toLowerCase();
  const drText = (req.disasterRecovery?.value ?? '').toString().toLowerCase();
  const backupText = (req.backup?.value ?? '').toString().toLowerCase();

  const requiresHighAvailability = availabilityText.includes('99.9') || availabilityText.includes('ha') || availabilityText.includes('multi-az') || users > 500;
  const requiresDR = drText.includes('dr') || drText.includes('recovery') || drText.includes('failover') || drText.includes('multi-region') || users > 1000;
  const requiresBackup = backupText.length > 0 || true; // Always recommended for production

  // 1. Scale Rule Evaluation
  let recommendedTier: 'Standard' | 'Premium' | 'Enterprise' = 'Standard';
  if (users >= 1000 || employees >= 2000) {
    recommendedTier = 'Enterprise';
    decisionLogs.push({
      id: `dec_${Date.now()}_1`,
      ruleTriggered: 'Scale Rule: Users >= 1000 or Employees >= 2000',
      decision: 'Recommend Enterprise Tier compute (P2v3 / db.m5.2xlarge) with dedicated bandwidth',
      appliedTo: 'Compute & Database Tiers',
      timestamp: now,
    });
  } else if (users >= 300 || employees >= 500) {
    recommendedTier = 'Premium';
    decisionLogs.push({
      id: `dec_${Date.now()}_2`,
      ruleTriggered: 'Scale Rule: Users >= 300 or Employees >= 500',
      decision: 'Recommend Premium Tier compute (P1v3 / db.m5.xlarge) with auto-scaling',
      appliedTo: 'Compute & Database Tiers',
      timestamp: now,
    });
  } else {
    decisionLogs.push({
      id: `dec_${Date.now()}_3`,
      ruleTriggered: 'Scale Rule: Standard SME Workload',
      decision: 'Recommend Standard Tier compute with burstable CPU options for cost efficiency',
      appliedTo: 'Compute & Database Tiers',
      timestamp: now,
    });
  }

  // 2. High Availability & DR Rules
  if (requiresHighAvailability) {
    decisionLogs.push({
      id: `dec_${Date.now()}_4`,
      ruleTriggered: 'Availability Rule: High Availability / 99.9%+ SLA requested',
      decision: 'Provision Multi-AZ Zone Redundant Database and Load Balancers with automatic failover',
      appliedTo: 'Database & Networking',
      timestamp: now,
    });
  }

  if (requiresDR) {
    decisionLogs.push({
      id: `dec_${Date.now()}_5`,
      ruleTriggered: 'Disaster Recovery Rule: DR / Multi-Region replication required',
      decision: 'Add Cross-Region Recovery Vault & Secondary Passive Region Standby',
      appliedTo: 'Backup & DR',
      timestamp: now,
    });
  }

  // 3. Compatibility & Budget Conflict Warnings
  // Check if user requested High Availability + DR + Enterprise scale on a low budget (< $1000 / ₹70,000)
  if (budget > 0 && budget < 1000 && (requiresDR || recommendedTier === 'Enterprise')) {
    warnings.push({
      id: `warn_${Date.now()}_1`,
      severity: 'warning',
      title: 'Budget vs. High Availability & DR Conflict',
      description: `Target monthly budget ($${budget.toLocaleString()}) may be constrained for a full Enterprise Multi-Region DR setup.`,
      mitigation: 'Recommend starting with Option C (Budget Serverless HA) or Option B (Balanced Single-Region Multi-AZ) before scaling to Multi-Region DR.',
      fieldConflict: 'budget',
    });
  }

  if (budget > 0 && budget < 300) {
    warnings.push({
      id: `warn_${Date.now()}_2`,
      severity: 'info',
      title: 'Cost Optimization Advisory',
      description: 'Monthly budget is optimized for auto-scaling serverless primitives.',
      mitigation: 'Option C utilizes serverless compute and database auto-pause to remain strictly within budget bounds.',
      fieldConflict: 'budget',
    });
  }

  logger.info('Decisions evaluated', { warningsCount: warnings.length, tier: recommendedTier });

  return {
    warnings,
    decisionLogs,
    recommendedTier,
    requiresDR,
    requiresBackup,
    requiresHighAvailability,
  };
}
