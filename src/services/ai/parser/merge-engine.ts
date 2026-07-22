/**
 * Merge Engine — deep-merges new AI extractions into the existing
 * requirement model.
 *
 * Rules:
 * - New non-null values overwrite null or lower-confidence values.
 * - Manual overrides are NEVER overwritten by AI.
 * - Duplicate values are ignored.
 * - Corrections (same field, different value, high confidence) update the AI value.
 * - Every merge produces a version bump.
 */

import type { RequirementModel, RequirementField, RequirementFieldKey } from '@/types';
import { REQUIREMENT_FIELD_KEYS } from '@/types';
import { REQUIRED_FIELDS } from '@/constants/requirement-fields';
import { normalizeValue } from './normalizers';
import { parserLogger } from '@/utils/logger';

interface FieldUpdate {
  value: unknown;
  confidence: number;
}

/**
 * Merges extracted fields into an existing requirement model.
 * Returns a new model (immutable) and a list of changed field keys.
 */
export function mergeRequirements(
  current: RequirementModel,
  extractedFields: Record<string, FieldUpdate>,
  messageId?: string,
): { merged: RequirementModel; changedFields: RequirementFieldKey[] } {
  const merged = { ...current };
  const changedFields: RequirementFieldKey[] = [];
  const now = new Date().toISOString();

  for (const [rawKey, update] of Object.entries(extractedFields)) {
    const key = rawKey as RequirementFieldKey;
    if (!REQUIREMENT_FIELD_KEYS.includes(key)) continue;

    const existing = merged[key] as RequirementField<unknown>;
    if (!existing) continue;

    // Normalise the incoming value
    const normalised = normalizeValue(key, update.value);
    if (normalised === null || normalised === undefined) continue;

    // If there's a manual override, never touch the effective value
    if (existing.manualOverride !== null) {
      // Still update the AI value for reference
      if (JSON.stringify(existing.aiValue) !== JSON.stringify(normalised)) {
        (merged[key] as RequirementField<unknown>) = {
          ...existing,
          aiValue: normalised,
          confidence: update.confidence,
          extractedFrom: messageId,
          updatedAt: now,
        };
        changedFields.push(key);
      }
      continue;
    }

    // Skip duplicates
    if (JSON.stringify(existing.value) === JSON.stringify(normalised) && existing.confidence >= update.confidence) {
      continue;
    }

    // Merge: new value wins if it's non-null and confidence >= existing
    (merged[key] as RequirementField<unknown>) = {
      ...existing,
      value: normalised,
      aiValue: normalised,
      confidence: update.confidence,
      source: 'ai',
      extractedFrom: messageId,
      updatedAt: now,
    };
    changedFields.push(key);
  }

  // Recompute completion
  merged.version = current.version + (changedFields.length > 0 ? 1 : 0);
  merged.updatedAt = now;
  const { completionPercentage, missingFields } = computeCompletion(merged);
  merged.completionPercentage = completionPercentage;
  merged.missingFields = missingFields;

  return { merged, changedFields };
}

/**
 * Applies a manual override to a single field.
 * The effective value becomes the manual value; the AI value is preserved.
 */
export function applyManualOverride(
  current: RequirementModel,
  field: RequirementFieldKey,
  value: unknown,
): RequirementModel {
  const now = new Date().toISOString();
  const existing = current[field] as RequirementField<unknown>;

  const updated = {
    ...current,
    [field]: {
      ...existing,
      value,
      manualOverride: value,
      source: 'manual' as const,
      confidence: 100,
      updatedAt: now,
    },
    version: current.version + 1,
    updatedAt: now,
  };

  const { completionPercentage, missingFields } = computeCompletion(updated);
  updated.completionPercentage = completionPercentage;
  updated.missingFields = missingFields;

  return updated;
}

/**
 * Fields the Budget field depends on. Budget is only "complete" once the amount
 * AND its currency AND its period are all known — an amount alone is ambiguous
 * (₹500,000/month vs $500,000/year are very different).
 */
export const BUDGET_DEPENDENCIES: RequirementFieldKey[] = ['budgetCurrency', 'budgetPeriod'];

/** True when a field has a usable (non-empty) value. */
function hasFieldValue(field?: RequirementField<unknown>): boolean {
  if (!field) return false;
  const v = field.value;
  return v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '');
}

/**
 * Returns the budget-dependency fields that are still missing. Dependencies only
 * apply once a budget amount has been provided — with no budget amount, there is
 * nothing to qualify, so this returns an empty list.
 */
export function getMissingBudgetDependencies(model: RequirementModel): RequirementFieldKey[] {
  if (!hasFieldValue(model.budget as RequirementField<unknown>)) return [];
  return BUDGET_DEPENDENCIES.filter((key) => !hasFieldValue(model[key] as RequirementField<unknown>));
}

/** Budget is complete only when the amount, currency, and period are all present. */
export function isBudgetComplete(model: RequirementModel): boolean {
  return (
    hasFieldValue(model.budget as RequirementField<unknown>) &&
    getMissingBudgetDependencies(model).length === 0
  );
}

/**
 * Computes the percentage of required fields that have non-null values.
 *
 * Dependency validation: the Budget field only counts toward completion when its
 * dependent fields (currency + period) are also present. If the amount was given
 * without them, Budget is NOT marked complete and the missing dependencies are
 * surfaced instead — so readiness can only reach 100% once they are provided.
 */
export function computeCompletion(model: RequirementModel): {
  completionPercentage: number;
  missingFields: RequirementFieldKey[];
} {
  const missing: RequirementFieldKey[] = [];
  let filled = 0;

  for (const meta of REQUIRED_FIELDS) {
    if (meta.key === 'budget') {
      if (isBudgetComplete(model)) {
        filled++;
      } else if (hasFieldValue(model.budget as RequirementField<unknown>)) {
        // Amount captured but incomplete — ask for the missing dependencies
        // (currency / period) rather than re-asking for the amount.
        missing.push(...getMissingBudgetDependencies(model));
      } else {
        missing.push('budget');
      }
      continue;
    }

    const field = model[meta.key] as RequirementField<unknown>;
    if (hasFieldValue(field)) {
      filled++;
    } else {
      missing.push(meta.key);
    }
  }

  const pct = REQUIRED_FIELDS.length > 0 ? Math.round((filled / REQUIRED_FIELDS.length) * 100) : 0;
  return { completionPercentage: pct, missingFields: missing };
}
