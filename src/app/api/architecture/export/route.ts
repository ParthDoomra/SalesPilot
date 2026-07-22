/**
 * POST /api/architecture/export
 *
 * Exports the selected solution architecture in JSON, Markdown, or PDF format.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchitectureByProject } from '@/services/firebase/architectures';
import { classifyError } from '@/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, format = 'json', optionId } = body as {
      projectId: string;
      format: 'json' | 'markdown' | 'pdf';
      optionId?: string;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const arch = await getArchitectureByProject(projectId);
    if (!arch) {
      return NextResponse.json({ error: 'No architecture found' }, { status: 404 });
    }

    const selectedOpt = arch.options.find((o) => o.id === (optionId || arch.selectedOptionId)) || arch.options[0];

    if (format === 'json') {
      const payload = {
        projectId,
        architectureId: arch.id,
        version: arch.version,
        provider: arch.selectedProvider,
        selectedOption: selectedOpt,
        compatibilityWarnings: arch.compatibilityWarnings,
        decisionLogs: arch.decisionLogs,
        phase4PricingReady: true,
      };
      return NextResponse.json({ format: 'json', payload });
    }

    if (format === 'markdown') {
      const md = `
# Solution Architecture Specification — ${selectedOpt.name}

**Provider:** ${arch.selectedProvider}  
**Rating:** ${'⭐'.repeat(selectedOpt.starRating)}  
**Estimated Cost Range:** ${selectedOpt.costEstimateRange}  
**Confidence Score:** ${selectedOpt.confidence}%  

## Executive Summary
${selectedOpt.description}

## Architectural Rationale
${selectedOpt.recommendationReason}

## Service Component Breakdown
${selectedOpt.services
  .map(
    (s) => `### ${s.name} (${s.category})
- **Tier:** ${s.tier}
- **Selection Rationale:** ${s.reason}
- **Confidence:** ${s.confidence}%
${s.estimatedMonthlyCostRange ? `- **Estimated Cost:** ${s.estimatedMonthlyCostRange}` : ''}
`,
  )
  .join('\n')}

## Decision Engine Log
${arch.decisionLogs.map((d) => `- **${d.ruleTriggered}**: ${d.decision}`).join('\n')}
      `.trim();

      return NextResponse.json({ format: 'markdown', payload: md });
    }

    // PDF text payload
    return NextResponse.json({
      format: 'pdf',
      payload: {
        title: `SalesPilot Solution Architecture — ${selectedOpt.name}`,
        provider: arch.selectedProvider,
        costEstimate: selectedOpt.costEstimateRange,
        servicesCount: selectedOpt.services.length,
        text: `${selectedOpt.name} - ${selectedOpt.description}`,
      },
    });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
