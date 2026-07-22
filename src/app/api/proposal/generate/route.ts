/**
 * POST /api/proposal/generate
 *
 * Assembles the Phase 5 proposal from the three prior phases. The client passes
 * the selected architecture (its durable source of truth) in the body; the
 * requirement is read on the server and the pricing report is computed here, so
 * the proposal combines all three without asking the user to re-enter anything.
 *
 * Returns `{ proposal: null, reason: 'no-architecture' }` (200) when no
 * architecture has been selected yet, so the UI can show a guiding empty state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveArchitecture } from '@/services/firebase/architectures';
import { getRequirement } from '@/services/firebase/requirements';
import { estimatePricing } from '@/services/ai/pricing';
import { buildProposal } from '@/services/ai/proposal/builder';
import type { ArchitectureModel } from '@/types';
import { classifyError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { architecture, customerName } = body as {
      architecture?: ArchitectureModel;
      customerName?: string;
    };

    if (!architecture || !architecture.projectId || !Array.isArray(architecture.options) || architecture.options.length === 0) {
      return NextResponse.json({ proposal: null, reason: 'no-architecture' });
    }

    // Keep the server store consistent with the client's selection.
    await saveArchitecture(architecture);

    // Combine: Requirement JSON (server) + selected Architecture (body) + Pricing.
    const requirement = await getRequirement(architecture.projectId);
    const estimate = estimatePricing(architecture, requirement);
    const proposal = buildProposal({ architecture, requirement, estimate, customerName });

    return NextResponse.json({ proposal });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
