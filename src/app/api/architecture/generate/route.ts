/**
 * POST /api/architecture/generate
 *
 * Reads Requirement JSON for a project, runs Cloud Recommender, Decision Engine,
 * and Architecture Agent to generate 3 options (Performance, Balanced, Budget),
 * saves the ArchitectureModel, and creates Version 1.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { generateArchitecture } from '@/services/ai/architecture-agent';
import { recommendProvider } from '@/services/ai/cloud-recommender';
import {
  getArchitectureByProject,
  saveArchitecture,
  pruneProjectArchitectures,
} from '@/services/firebase/architectures';
import { createArchitectureVersion } from '@/services/firebase/architecture-versions';
import { saveRecommendations } from '@/services/firebase/recommendations';
import { saveDecisionLogs } from '@/services/firebase/decision-logs';
import { createEmptyRequirement } from '@/types';
import type { CloudProvider } from '@/types';
import { classifyError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, providerOverride } = body as {
      projectId: string;
      providerOverride?: CloudProvider;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // 1. Fetch Requirement Model. If Phase 2 hasn't run yet, seed an empty
    //    requirement so the generator can still produce sensible defaults
    //    (matches the auto-create behaviour of GET /requirements).
    let requirement = await getRequirement(projectId);
    if (!requirement) {
      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      requirement = createEmptyRequirement(projectId, reqId);
      await saveRequirement(requirement);
    }

    // 2. Evaluate all three providers on merit (background) and pick the
    //    effective provider. The customer's preferred provider is respected by
    //    default; an explicit client override (e.g. "Use AI Recommendation")
    //    always wins. The recommendation is returned so the UI can surface it.
    const recommendation = recommendProvider(requirement);
    const effectiveProvider =
      providerOverride ?? recommendation.preferred ?? recommendation.recommended;

    const architecture = await generateArchitecture({
      projectId,
      requirement,
      providerOverride: effectiveProvider,
    });

    // 3. Keep a single architecture per project. When regenerating (e.g. a
    //    provider switch), reuse the existing id and bump the version instead
    //    of leaving an orphaned duplicate in the store.
    const existing = await getArchitectureByProject(projectId);
    let changeSummary = 'Initial architecture generation (V1)';
    if (existing) {
      architecture.id = existing.id;
      architecture.version = existing.version + 1;
      architecture.createdAt = existing.createdAt;
      changeSummary = `Regenerated architecture with ${architecture.selectedProvider} (V${architecture.version})`;
    }

    // 4. Persist to storage
    await saveArchitecture(architecture);
    await pruneProjectArchitectures(projectId, architecture.id);
    await createArchitectureVersion(architecture, changeSummary);
    await saveRecommendations(projectId, architecture.recommendations);
    await saveDecisionLogs(projectId, architecture.decisionLogs);

    return NextResponse.json({ architecture, recommendation }, { status: 201 });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
