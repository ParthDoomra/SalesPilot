/**
 * Requirement Parser — transforms raw LLM JSON output into typed
 * RequirementField updates.
 *
 * Handles malformed JSON gracefully (extracts from markdown fences,
 * strips trailing commas, etc.).
 */

import type { RequirementFieldKey } from '@/types';
import { REQUIREMENT_FIELD_KEYS } from '@/types';
import { parserLogger } from '@/utils/logger';
import { AIServiceError } from '@/utils/error-handler';

// ---------------------------------------------------------------------------
// Types for the raw LLM output
// ---------------------------------------------------------------------------

export interface RawExtractionResult {
  message: string;
  extractedFields: Record<string, { value: unknown; confidence: number }>;
  followUpQuestions: string[];
}

// ---------------------------------------------------------------------------
// JSON extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a JSON object from a string that may be wrapped in markdown
 * fences or contain preamble text.
 */
export function extractJSON(raw: string): string {
  // Try to find a JSON block in markdown fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a raw JSON object
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];

  return raw.trim();
}

/**
 * Attempt to parse potentially malformed JSON (trailing commas, etc.).
 */
function safeParse(raw: string): unknown {
  const cleaned = raw
    .replace(/,\s*}/g, '}')    // trailing comma before }
    .replace(/,\s*]/g, ']')    // trailing comma before ]
    .replace(/[\x00-\x1F\x7F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : ''); // control chars

  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses the full LLM response into a structured extraction result.
 * Returns null if parsing fails entirely.
 */
export function parseExtractionResponse(rawResponse: string): RawExtractionResult | null {
  try {
    const jsonStr = extractJSON(rawResponse);
    const parsed = safeParse(jsonStr) as Record<string, unknown>;

    const message = typeof parsed.message === 'string' ? parsed.message : '';

    // Validate extracted fields
    const extractedFields: Record<string, { value: unknown; confidence: number }> = {};
    if (parsed.extractedFields && typeof parsed.extractedFields === 'object') {
      const fields = parsed.extractedFields as Record<string, unknown>;
      for (const [key, val] of Object.entries(fields)) {
        if (!REQUIREMENT_FIELD_KEYS.includes(key as RequirementFieldKey)) {
          parserLogger.warn(`Ignoring unknown field: ${key}`);
          continue;
        }
        if (val && typeof val === 'object' && 'value' in (val as Record<string, unknown>)) {
          const typed = val as { value: unknown; confidence?: number };
          extractedFields[key] = {
            value: typed.value,
            confidence: typeof typed.confidence === 'number' ? Math.min(100, Math.max(0, typed.confidence)) : 80,
          };
        }
      }
    }

    const followUpQuestions: string[] = [];
    if (Array.isArray(parsed.followUpQuestions)) {
      for (const q of parsed.followUpQuestions) {
        if (typeof q === 'string' && q.trim()) followUpQuestions.push(q.trim());
      }
    }

    return { message, extractedFields, followUpQuestions };
  } catch (err) {
    parserLogger.error('Failed to parse extraction response', {
      error: String(err),
      rawLength: rawResponse.length,
    });
    return null;
  }
}

/**
 * Parses a validation response from the Validation Agent.
 */
export function parseValidationResponse(rawResponse: string): {
  issues: Array<{ field: string; severity: string; message: string; suggestedQuestion: string }>;
  summary: string;
} | null {
  try {
    const jsonStr = extractJSON(rawResponse);
    const parsed = safeParse(jsonStr) as Record<string, unknown>;

    const issues: Array<{ field: string; severity: string; message: string; suggestedQuestion: string }> = [];
    if (Array.isArray(parsed.issues)) {
      for (const issue of parsed.issues) {
        if (issue && typeof issue === 'object') {
          const i = issue as Record<string, unknown>;
          issues.push({
            field: String(i.field ?? ''),
            severity: String(i.severity ?? 'missing'),
            message: String(i.message ?? ''),
            suggestedQuestion: String(i.suggestedQuestion ?? ''),
          });
        }
      }
    }

    return {
      issues,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch (err) {
    parserLogger.error('Failed to parse validation response', { error: String(err) });
    return null;
  }
}
