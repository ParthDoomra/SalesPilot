/**
 * GET /api/projects/[id]/requirements/versions — list all version snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequirement } from '@/services/firebase/requirements';
import { listVersions } from '@/services/firebase/requirement-versions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;

  const requirement = await getRequirement(projectId);
  if (!requirement) {
    return NextResponse.json({ versions: [] });
  }

  const versions = await listVersions(requirement.id);
  return NextResponse.json({ versions });
}
