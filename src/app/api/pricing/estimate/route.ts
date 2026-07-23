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
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { estimatePricing } from '@/services/ai/pricing';
import { currencyService } from '@/services/currency';
import { primeAzurePricing } from '@/services/pricing-providers';
import type { ArchitectureModel, RequirementModel } from '@/types';
import { classifyError } from '@/utils/error-handler';

/**
 * Populate the 24h exchange-rate cache before the (synchronous) Pricing Engine
 * converts the customer's budget through CurrencyService. Failures are ignored
 * here: on API-down-with-prior-cache the cached rate is used, and if a budget
 * conversion is genuinely needed with no cached rate at all, the estimator
 * throws a meaningful error that the handlers below classify into a 500.
 */
async function primeExchangeRates(): Promise<void> {
  try {
    await currencyService.ensureRatesLoaded();
  } catch {
    // Intentionally swallowed — see estimator error handling.
  }
}

/**
 * Refresh the live Azure price index (Azure Retail Prices API) into the pricing
 * catalog before estimating, replacing the previous mock figure. Cached for 24h;
 * on failure the last cached/baseline value is used, so pricing never breaks.
 * The estimator's formula is unchanged — only the Azure data source is live now.
 */
async function primePricingSources(): Promise<void> {
  await Promise.all([primeExchangeRates(), primeAzurePricing()]);
}

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
    if (bodyRequirement) {
      await saveRequirement(bodyRequirement);
    }
    await primePricingSources();
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
    await primePricingSources();
    const estimate = estimatePricing(architecture, requirement);
    return NextResponse.json({ estimate });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
