/**
 * GET /api/pricing/estimate?projectId=...
 *
 * Reads the project's current Phase 3 architecture and returns an offline,
 * catalog-based cost estimate for every architecture alternative. Returns
 * `{ estimate: null }` (200) when no architecture exists yet, so the UI can
 * render a "generate architecture first" empty state instead of an error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchitectureByProject, saveArchitecture } from '@/services/firebase/architectures';
import { getRequirement } from '@/services/firebase/requirements';
import { estimatePricing } from '@/services/ai/pricing';
import type { ArchitectureModel, RequirementModel } from '@/types';
import { classifyError } from '@/utils/error-handler';

/**
 * POST /api/pricing/estimate
 *
 * Preferred entry point for the Pricing module. The client passes the selected
 * Phase 3 architecture (its durable source of truth) in the body, so pricing
 * never depends on the server's in-memory architecture store. The Phase 2
 * requirement is read on the server (and re-seeded from the body if provided).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { architecture, requirement: bodyRequirement } = body as {
      architecture?: ArchitectureModel;
      requirement?: RequirementModel | null;
    };

    if (!architecture || !architecture.projectId) {
      return NextResponse.json({ estimate: null, reason: 'no-architecture' });
    }

    // Keep the server store consistent with the client's selection.
    await saveArchitecture(architecture);

    const requirement = bodyRequirement ?? (await getRequirement(architecture.projectId));
    const estimate = estimatePricing(architecture, requirement);
    return NextResponse.json({ estimate });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Input 2 — the selected Phase 3 architecture.
    const architecture = await getArchitectureByProject(projectId);
    if (!architecture) {
      return NextResponse.json({ estimate: null, reason: 'no-architecture' });
    }

    // Input 1 — the Phase 2 requirement JSON (budget, region, users, …).
    const requirement = await getRequirement(projectId);

    // Combine both inputs → pricing report.
    const estimate = estimatePricing(architecture, requirement);
    return NextResponse.json({ estimate });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
