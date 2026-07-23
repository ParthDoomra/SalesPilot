/**
 * POST /api/requirements/upload
 *
 * Accepts uploaded document files (PDF, DOCX, Excel), extracts content using
 * document-parser, runs AI requirement extraction, saves the updated
 * Requirement JSON to Firebase, and returns the result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parsePDF, parseDOCX, parseExcel } from '@/services/ai/parser/document-parser';
import { extractRequirementsFromText } from '@/services/ai/requirement-agent';
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { createVersion } from '@/services/firebase/requirement-versions';
import { createEmptyRequirement } from '@/types';
import type { RequirementFieldKey } from '@/types';
import { classifyError, AIServiceError } from '@/utils/error-handler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('API:RequirementsUpload');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const intakeMethod = (formData.get('intakeMethod') as string | null) || 'pdf';

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'A valid document file is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    const fileName = file.name.toLowerCase();

    if (intakeMethod === 'pdf' || fileName.endsWith('.pdf')) {
      extractedText = await parsePDF(buffer);
    } else if (intakeMethod === 'docx' || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      extractedText = await parseDOCX(buffer);
    } else if (
      intakeMethod === 'excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')
    ) {
      extractedText = await parseExcel(buffer);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a PDF, DOCX, or Excel file.' },
        { status: 400 },
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text or data could be extracted from the uploaded document.' },
        { status: 400 },
      );
    }

    // Load or create requirement
    let requirement = await getRequirement(projectId);
    if (!requirement) {
      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      requirement = createEmptyRequirement(projectId, reqId);
      await saveRequirement(requirement);
    }

    // Extract requirements via AI agent
    const result = await extractRequirementsFromText({
      text: extractedText,
      currentRequirement: requirement,
      sourceId: `file_${intakeMethod}_${Date.now()}`,
    });

    // Save updated requirement to Firebase
    await saveRequirement(result.updatedRequirement);

    // Snapshot version if fields changed
    if (result.changedFields.length > 0) {
      await createVersion(result.updatedRequirement, result.changedFields as RequirementFieldKey[]);
    }

    logger.info('File upload requirements extracted', {
      projectId,
      fileName: file.name,
      intakeMethod,
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
    logger.error('Upload endpoint error', { code: classified.code, message: classified.message });
    return NextResponse.json(
      { error: classified.userMessage, code: classified.code },
      { status: classified.code === 'RATE_LIMITED' ? 429 : 500 },
    );
  }
}
