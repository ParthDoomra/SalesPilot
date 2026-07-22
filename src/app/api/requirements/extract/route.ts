/**
 * POST /api/requirements/extract
 *
 * Primary Phase 2 entry point. Accepts pasted requirement text (or text
 * extracted from an uploaded document) and returns the updated, structured
 * Requirement JSON — the single source of truth every later phase consumes.
 *
 * Conversation-free: this does NOT create chat messages. It runs the same
 * extract → parse → merge pipeline as the chat agent, persists the requirement,
 * and snapshots a version when fields change.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractRequirementsFromText } from '@/services/ai/requirement-agent';
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { createVersion } from '@/services/firebase/requirement-versions';
import { createEmptyRequirement } from '@/types';
import type { RequirementFieldKey } from '@/types';
import { classifyError, AIServiceError } from '@/utils/error-handler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('API:RequirementsExtract');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, text, sourceType } = body as {
      projectId: string;
      text: string;
      sourceType?: string;
    };

    if (!projectId || !text?.trim()) {
      return NextResponse.json(
        { error: 'projectId and non-empty text are required' },
        { status: 400 },
      );
    }

    // Load or create the requirement (single source of truth per project).
    let requirement = await getRequirement(projectId);
    if (!requirement) {
      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      requirement = createEmptyRequirement(projectId, reqId);
      await saveRequirement(requirement);
    }

    const result = await extractRequirementsFromText({
      text,
      currentRequirement: requirement,
      sourceId: `${sourceType || 'paste'}_${Date.now()}`,
    });

    await saveRequirement(result.updatedRequirement);

    if (result.changedFields.length > 0) {
      await createVersion(result.updatedRequirement, result.changedFields as RequirementFieldKey[]);
    }

    logger.info('Requirements extracted from text', {
      projectId,
      sourceType: sourceType || 'paste',
      changedFields: result.changedFields,
    });

    return NextResponse.json({
      requirement: result.updatedRequirement,
      changedFields: result.changedFields,
      extractedFields: result.extractedFields,
      message: result.message,
      followUpQuestions: result.followUpQuestions,
    });
  } catch (err) {
    const classified = err instanceof AIServiceError ? err : classifyError(err);
    logger.error('Extraction endpoint error', { code: classified.code, message: classified.message });
    return NextResponse.json(
      { error: classified.userMessage, code: classified.code },
      { status: classified.code === 'RATE_LIMITED' ? 429 : 500 },
    );
  }
}
