/**
 * Requirement Intelligence Engine — Core Requirement Types
 *
 * Every extracted field carries its own confidence score, source attribution,
 * and manual-override slot so the UI can display provenance and the merge
 * engine can reconcile AI vs. human edits without data loss.
 */

// ---------------------------------------------------------------------------
// Field-level wrapper
// ---------------------------------------------------------------------------

/** Generic wrapper for every field in the requirement model. */
export interface RequirementField<T> {
  /** The effective value (manual override takes precedence over AI). */
  value: T | null;
  /** 0–100 confidence score assigned by the extraction agent. */
  confidence: number;
  /** Who last set the value. */
  source: 'ai' | 'manual' | 'merged';
  /** The raw value produced by the AI agent. */
  aiValue: T | null;
  /** A value explicitly set by the user (always wins). */
  manualOverride: T | null;
  /** ID of the message from which the value was extracted. */
  extractedFrom?: string;
  /** ISO timestamp of the last update. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Requirement model
// ---------------------------------------------------------------------------

/** All trackable requirement fields — order matches the UI sidebar. */
export interface RequirementFields {
  company: RequirementField<string>;
  industry: RequirementField<string>;
  employees: RequirementField<number>;
  users: RequirementField<number>;
  region: RequirementField<string>;
  solutionType: RequirementField<string>;
  budget: RequirementField<number>;
  budgetCurrency: RequirementField<string>;
  budgetPeriod: RequirementField<'monthly' | 'yearly' | 'one-time'>;
  cloudProvider: RequirementField<string>;
  database: RequirementField<string>;
  backup: RequirementField<string>;
  disasterRecovery: RequirementField<string>;
  storage: RequirementField<string>;
  compliance: RequirementField<string[]>;
  security: RequirementField<string>;
  networking: RequirementField<string>;
  availability: RequirementField<string>;
}

/** Key names that can appear on the RequirementFields object. */
export type RequirementFieldKey = keyof RequirementFields;

/** The full persisted requirement document. */
export interface RequirementModel extends RequirementFields {
  id: string;
  projectId: string;
  version: number;
  /** Computed – percentage of non-null fields. */
  completionPercentage: number;
  /** Computed – field keys whose value is still null. */
  missingFields: RequirementFieldKey[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

/** An immutable snapshot taken every time the model changes. */
export interface RequirementVersion {
  id: string;
  requirementId: string;
  version: number;
  snapshot: RequirementModel;
  changedFields: RequirementFieldKey[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a blank RequirementField. */
export function emptyField<T>(): RequirementField<T> {
  return {
    value: null,
    confidence: 0,
    source: 'ai',
    aiValue: null,
    manualOverride: null,
    updatedAt: new Date().toISOString(),
  };
}

/** All field keys in display order. */
export const REQUIREMENT_FIELD_KEYS: RequirementFieldKey[] = [
  'company',
  'industry',
  'employees',
  'users',
  'region',
  'solutionType',
  'budget',
  'budgetCurrency',
  'budgetPeriod',
  'cloudProvider',
  'database',
  'backup',
  'disasterRecovery',
  'storage',
  'compliance',
  'security',
  'networking',
  'availability',
];

/** Returns a brand-new empty RequirementModel. */
export function createEmptyRequirement(projectId: string, id: string): RequirementModel {
  const now = new Date().toISOString();
  const base: Record<string, RequirementField<unknown>> = {};
  for (const key of REQUIREMENT_FIELD_KEYS) {
    base[key] = emptyField();
  }
  return {
    ...(base as unknown as RequirementFields),
    id,
    projectId,
    version: 0,
    completionPercentage: 0,
    missingFields: [...REQUIREMENT_FIELD_KEYS],
    createdAt: now,
    updatedAt: now,
  };
}
