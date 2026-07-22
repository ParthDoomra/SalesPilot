/**
 * PUT /api/architecture/update
 *
 * Updates active option selection, provider selection, or manually edits services.
 * Bumps architecture version and creates a version snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchitectureByProject, saveArchitecture } from '@/services/firebase/architectures';
import { createArchitectureVersion } from '@/services/firebase/architecture-versions';
import type { CloudProvider, ArchitectureModel, ArchitectureOption } from '@/types';
import { classifyError } from '@/utils/error-handler';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, selectedOptionId, selectedProvider, updatedOption, architecture } = body as {
      projectId: string;
      selectedOptionId?: string;
      selectedProvider?: CloudProvider;
      updatedOption?: ArchitectureOption;
      /** Full model sent by the client so the server can self-heal after a reset. */
      architecture?: ArchitectureModel;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // The server keeps architectures in memory, which can be lost on reload.
    // When that happens, re-seed from the architecture the client still holds
    // rather than failing — the client is the durable source of truth.
    let arch = await getArchitectureByProject(projectId);
    if (!arch && architecture && architecture.projectId === projectId) {
      arch = await saveArchitecture(architecture);
    }
    if (!arch) {
      return NextResponse.json({ error: 'No architecture found for project' }, { status: 404 });
    }

    const updated = { ...arch };
    let changeSummary = 'Updated architecture parameters';

    if (selectedOptionId) {
      updated.selectedOptionId = selectedOptionId;
      changeSummary = `Selected option ${selectedOptionId}`;
    }

    if (selectedProvider) {
      updated.selectedProvider = selectedProvider;
      changeSummary = `Switched provider to ${selectedProvider}`;
    }

    if (updatedOption) {
      updated.options = updated.options.map((opt) => (opt.id === updatedOption.id ? updatedOption : opt));
      changeSummary = `Edited option ${updatedOption.name}`;
    }

    updated.version = arch.version + 1;
    updated.updatedAt = new Date().toISOString();

    await saveArchitecture(updated);
    await createArchitectureVersion(updated, changeSummary);

    return NextResponse.json({ architecture: updated });
  } catch (err) {
    const classified = classifyError(err);
    return NextResponse.json({ error: classified.userMessage }, { status: 500 });
  }
}
