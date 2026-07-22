/**
 * Metadata for every requirement field — drives the requirement panel UI,
 * validation agent, and completion calculation.
 */

import type { RequirementFieldKey } from '@/types';

export interface FieldMeta {
  key: RequirementFieldKey;
  label: string;
  description: string;
  type: 'string' | 'number' | 'string[]' | 'select';
  /** If true, the field counts toward the "required" completion %. */
  required: boolean;
  /** Display group for the sidebar. */
  group: 'business' | 'infrastructure' | 'compliance' | 'budget';
  /** Options for select-type fields. */
  options?: string[];
}

export const REQUIREMENT_FIELD_META: FieldMeta[] = [
  // ── Business ──────────────────────────────────────────────────────────
  { key: 'company',         label: 'Company',           description: 'Customer company name',                         type: 'string',   required: true,  group: 'business' },
  { key: 'industry',        label: 'Industry',          description: 'Industry vertical (e.g. Finance, Healthcare)',  type: 'string',   required: true,  group: 'business' },
  { key: 'employees',       label: 'Employees',         description: 'Total headcount',                               type: 'number',   required: false, group: 'business' },
  { key: 'users',           label: 'Users',             description: 'Expected concurrent / licensed users',          type: 'number',   required: true,  group: 'business' },
  { key: 'region',          label: 'Region',            description: 'Primary deployment region or geography',        type: 'string',   required: true,  group: 'business' },
  { key: 'solutionType',    label: 'Solution Type',     description: 'Type of solution (ERP, CRM, Data Lake, …)',     type: 'string',   required: true,  group: 'business' },

  // ── Budget ────────────────────────────────────────────────────────────
  { key: 'budget',          label: 'Budget',            description: 'Budget amount',                                  type: 'number',   required: true,  group: 'budget' },
  { key: 'budgetCurrency',  label: 'Currency',          description: 'Budget currency code (INR, USD, …)',            type: 'string',   required: false, group: 'budget' },
  { key: 'budgetPeriod',    label: 'Budget Period',     description: 'Monthly, yearly, or one-time',                  type: 'select',   required: false, group: 'budget', options: ['monthly', 'yearly', 'one-time'] },

  // ── Infrastructure ───────────────────────────────────────────────────
  { key: 'cloudProvider',      label: 'Cloud Provider',      description: 'Preferred cloud (AWS, Azure, GCP, …)',  type: 'string',   required: true,  group: 'infrastructure' },
  { key: 'database',           label: 'Database',            description: 'Database technology or preference',      type: 'string',   required: true,  group: 'infrastructure' },
  { key: 'backup',             label: 'Backup',              description: 'Backup strategy / RPO',                  type: 'string',   required: false, group: 'infrastructure' },
  { key: 'disasterRecovery',   label: 'Disaster Recovery',   description: 'DR requirements / RTO',                  type: 'string',   required: false, group: 'infrastructure' },
  { key: 'storage',            label: 'Storage',             description: 'Storage needs and tiers',                type: 'string',   required: true,  group: 'infrastructure' },
  { key: 'networking',         label: 'Networking',          description: 'Network topology / VPN / CDN',           type: 'string',   required: false, group: 'infrastructure' },
  { key: 'availability',       label: 'Availability',        description: 'SLA / uptime target (e.g. 99.99%)',      type: 'string',   required: true,  group: 'infrastructure' },

  // ── Compliance ────────────────────────────────────────────────────────
  { key: 'compliance',  label: 'Compliance',  description: 'Regulatory / compliance frameworks (HIPAA, SOC2, …)', type: 'string[]', required: true,  group: 'compliance' },
  { key: 'security',    label: 'Security',    description: 'Security requirements and posture',                    type: 'string',   required: true,  group: 'compliance' },
];

/** Quick lookup by key. */
export const FIELD_META_MAP: Record<RequirementFieldKey, FieldMeta> = Object.fromEntries(
  REQUIREMENT_FIELD_META.map((m) => [m.key, m]),
) as Record<RequirementFieldKey, FieldMeta>;

/** Only the required fields — used for completion calculation. */
export const REQUIRED_FIELDS = REQUIREMENT_FIELD_META.filter((m) => m.required);

/**
 * Targeted question for each field, shown when asking the user to complete a
 * MISSING field. Phase 2's "fill missing fields" step only ever asks these for
 * fields that are still null — never for already-captured parameters.
 */
export const FIELD_QUESTIONS: Record<RequirementFieldKey, string> = {
  company: 'What is the customer company name?',
  industry: 'Which industry vertical is the customer in?',
  employees: 'How many employees does the organization have?',
  users: 'How many concurrent or licensed users are expected?',
  region: 'Which deployment region should be used?',
  solutionType: 'What type of solution is being built (ERP, CRM, Data Lake, …)?',
  budget: 'What is the target budget amount?',
  budgetCurrency: 'Which currency is the budget in (USD, INR, …)?',
  budgetPeriod: 'Is the budget monthly, yearly, or one-time?',
  cloudProvider: 'Which cloud provider is preferred (AWS, Azure, GCP)?',
  database: 'Which database technology is preferred?',
  backup: 'What backup strategy / RPO is required?',
  disasterRecovery: 'What disaster recovery / RTO is required?',
  storage: 'What storage needs and tiers are required?',
  networking: 'What networking topology is required (VPN, CDN, load balancing)?',
  availability: 'What uptime / availability SLA target is required (e.g. 99.9%)?',
  compliance: 'Which compliance frameworks apply (HIPAA, SOC 2, GDPR, …)?',
  security: 'What security requirements or posture are needed?',
};

/** Group labels for the sidebar. */
export const FIELD_GROUPS = [
  { key: 'business',       label: 'Business Information' },
  { key: 'budget',         label: 'Budget & Pricing' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'compliance',     label: 'Compliance & Security' },
] as const;
