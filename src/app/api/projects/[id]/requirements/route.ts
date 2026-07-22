/**
 * GET  /api/projects/[id]/requirements — get the current requirement model
 * PUT  /api/projects/[id]/requirements — manual field override
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { createVersion } from '@/services/firebase/requirement-versions';
import { createEmptyRequirement } from '@/types';
import type { RequirementFieldKey } from '@/types';
import { applyManualOverride } from '@/services/ai/parser/merge-engine';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  let requirement = await getRequirement(projectId);

  if (!requirement) {
    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    requirement = createEmptyRequirement(projectId, reqId);
    await saveRequirement(requirement);
  }

  return NextResponse.json({ requirement });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const body = await request.json();
  const { field, value } = body as { field: RequirementFieldKey; value: unknown };

  if (!field) {
    return NextResponse.json({ error: 'field is required' }, { status: 400 });
  }

  let requirement = await getRequirement(projectId);
  if (!requirement) {
    return NextResponse.json({ error: 'No requirement found for this project' }, { status: 404 });
  }

  // Apply manual override
  requirement = applyManualOverride(requirement, field, value);
  await saveRequirement(requirement);

  // Create version snapshot
  await createVersion(requirement, [field]);

  return NextResponse.json({ requirement });
}
