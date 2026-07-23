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

  let requirement = await getRequirement(projectId);
  if (!requirement) {
    return NextResponse.json({ error: 'No requirement found for this project' }, { status: 404 });
  }

  // Handle batch override array if provided
  if (Array.isArray(body.fields) && body.fields.length > 0) {
    const changedFields: RequirementFieldKey[] = [];
    for (const item of body.fields as Array<{ field: RequirementFieldKey; value: unknown }>) {
      if (item.field) {
        requirement = applyManualOverride(requirement, item.field, item.value);
        changedFields.push(item.field);
      }
    }
    await saveRequirement(requirement);
    if (changedFields.length > 0) {
      await createVersion(requirement, changedFields);
    }
    return NextResponse.json({ requirement, changedFields });
  }

  // Handle single field override
  const { field, value } = body as { field: RequirementFieldKey; value: unknown };
  if (!field) {
    return NextResponse.json({ error: 'field or fields array is required' }, { status: 400 });
  }

  requirement = applyManualOverride(requirement, field, value);
  await saveRequirement(requirement);
  await createVersion(requirement, [field]);

  return NextResponse.json({ requirement, changedFields: [field] });
}
