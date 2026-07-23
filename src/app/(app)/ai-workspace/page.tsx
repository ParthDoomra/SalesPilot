/**
 * AI Workspace Page — full-page workspace with project selector.
 *
 * Replaces the Phase 1 "Coming Soon" placeholder with the actual
 * three-panel workspace layout (conversations + chat + requirements).
 */

"use client";

import * as React from 'react';
import { Bot, FolderKanban, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';
import { useProjectsStore } from '@/lib/projects-store';
import { cn } from '@/lib/utils';

export default function AIWorkspacePage() {
  const router = useRouter();
  const { projects } = useProjectsStore();
  const activeProjects = projects.filter((p) => !p.archived);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = React.useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Auto-select first project if none selected
  React.useEffect(() => {
    if (!selectedProjectId && activeProjects.length > 0) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [activeProjects, selectedProjectId]);

  if (activeProjects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">No Projects Yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create a project first, then come back to start your AI-powered requirement conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      {/* Project selector bar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setSelectorOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-signal/40"
          >
            <FolderKanban className="h-4 w-4 text-signal" />
            {selectedProject?.name ?? 'Select project'}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {selectorOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-border-default bg-surface p-2 shadow-xl">
                {activeProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setSelectorOpen(false); }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      p.id === selectedProjectId
                        ? 'bg-signal-soft'
                        : 'hover:bg-surface-raised',
                    )}
                  >
                    <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.customer}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {selectedProject && (
          <span className="text-xs text-muted-foreground">
            {selectedProject.customer} · {selectedProject.status}
          </span>
        )}
      </div>

      {/* Workspace */}
      {selectedProjectId && (
        <div className="flex-1">
          <WorkspaceLayout
            projectId={selectedProjectId}
            onGenerateArchitecture={() => router.push(`/projects/${selectedProjectId}?tab=Architecture`)}
          />
        </div>
      )}
    </div>
  );
}
