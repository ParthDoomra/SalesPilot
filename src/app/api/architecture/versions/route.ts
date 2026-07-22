/**
 * GET /api/architecture/versions?projectId=...
 *
 * Lists the immutable version snapshots for a project's architecture,
 * ordered oldest → newest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchitectureByProject } from '@/services/firebase/architectures';
import { listArchitectureVersions } from '@/services/firebase/architecture-versions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const arch = await getArchitectureByProject(projectId);
  if (!arch) {
    return NextResponse.json({ versions: [] });
  }

  const versions = await listArchitectureVersions(arch.id);
  return NextResponse.json({ versions });
}
