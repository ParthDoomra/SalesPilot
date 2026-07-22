/**
 * POST /api/validation — run validation on a project's requirement model
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequirement } from '@/services/firebase/requirements';
import { validateRequirements } from '@/services/ai/validation-agent';
import { classifyError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body as { projectId: string };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const requirement = await getRequirement(projectId);
    if (!requirement) {
      return NextResponse.json({ error: 'No requirement found' }, { status: 404 });
    }

    const issues = await validateRequirements(requirement);

    return NextResponse.json({
      issues,
      completionPercentage: requirement.completionPercentage,
      missingFields: requirement.missingFields,
    });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json(
      { error: classified.userMessage },
      { status: 500 },
    );
  }
}
