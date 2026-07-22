/**
 * Phase 3 — Solution Architecture Generator Types
 *
 * Defines TypeScript interfaces for cloud architecture nodes, options (Option A/B/C),
 * compatibility warnings, provider recommendations, and version snapshots.
 */

export type CloudProvider = 'Azure' | 'AWS' | 'GCP';

export type ServiceCategory =
  | 'Compute'
  | 'Database'
  | 'Storage'
  | 'Networking'
  | 'Security'
  | 'Management'
  | 'Backup & DR';

export interface CloudServiceNode {
  id: string;
  name: string;
  provider: CloudProvider;
  category: ServiceCategory;
  tier: string;                     // e.g. "P1v3", "db.m5.xlarge", "Standard Tier"
  reason: string;                   // Why this service was selected
  confidence: number;               // 0-100% confidence
  icon?: string;                    // Lucide icon key
  estimatedMonthlyCostRange?: string; // e.g. "$120 - $180"
}

export type ArchitectureType = 'performance' | 'balanced' | 'budget';

export interface ArchitectureOption {
  id: string;
  name: string;
  type: ArchitectureType;
  starRating: number;               // 1-5
  badgeText: string;                // e.g. "Maximum Scale", "Recommended", "Lowest Cost"
  costEstimateRange: string;        // e.g. "₹2.8L - ₹3.2L / mo" ($3,400 / mo)
  confidence: number;               // 0-100%
  description: string;
  recommendationReason: string;
  services: CloudServiceNode[];
  visualFlowNodes: Array<{
    id: string;
    label: string;
    category: ServiceCategory;
    serviceName: string;
    connectedTo?: string[];
  }>;
}

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface CompatibilityWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  description: string;
  mitigation: string;
  fieldConflict?: string;
}

export interface CloudRecommendation {
  provider: CloudProvider;
  score: number;                    // 0-100
  pros: string[];
  cons: string[];
  fitReasoning: string;
}

export interface DecisionLog {
  id: string;
  ruleTriggered: string;
  decision: string;
  appliedTo: string;
  timestamp: string;
}

export interface ArchitectureModel {
  id: string;
  projectId: string;
  requirementId: string;
  selectedProvider: CloudProvider;
  selectedOptionId: string;
  options: ArchitectureOption[];
  recommendations: CloudRecommendation[];
  compatibilityWarnings: CompatibilityWarning[];
  decisionLogs: DecisionLog[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureVersion {
  id: string;
  architectureId: string;
  version: number;
  snapshot: ArchitectureModel;
  changedSummary: string;
  createdAt: string;
}
