/**
 * GET /api/architecture?projectId=...
 *
 * Fetches the current ArchitectureModel for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchitectureByProject } from '@/services/firebase/architectures';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const architecture = await getArchitectureByProject(projectId);
  return NextResponse.json({ architecture });
}
