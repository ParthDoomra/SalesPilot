/**
 * Workspace Layout — Phase 2 Requirement Intelligence workspace.
 *
 * Intake-first workflow:
 *   Center: Requirement Intake (paste text is primary; PDF/DOCX/Excel upload
 *           placeholders; AI conversation is optional for clarification).
 *   Right:  Requirement panel — the live Requirement JSON (single source of
 *           truth) with inline manual editing, plus version history.
 */

"use client";

import * as React from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequirementIntake } from './requirement-intake';
import { RequirementPanel } from './requirement-panel';
import { VersionHistory } from './version-history';
import { useConversationStore } from '@/features/workspace/stores/conversation-store';

interface WorkspaceLayoutProps {
  projectId: string;
  /** Called when the requirement is complete and the user opts to generate architecture. */
  onGenerateArchitecture?: () => void;
}

export function WorkspaceLayout({ projectId, onGenerateArchitecture }: WorkspaceLayoutProps) {
  const [rightOpen, setRightOpen] = React.useState(true);
  const [showVersions, setShowVersions] = React.useState(false);

  const { activeConversationId, setActiveConversation } = useConversationStore();

  // Ensure a conversation id exists for the optional AI Conversation method.
  React.useEffect(() => {
    if (!activeConversationId) {
      const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setActiveConversation(id);
    }
  }, [activeConversationId, setActiveConversation]);

  // Keyboard shortcut: toggle requirement panel.
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        setRightOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border-subtle bg-background">
      {/* Center: Requirement intake */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-3 py-2">
          <div className="text-xs text-muted-foreground/60">Requirement Intelligence Engine</div>
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors"
            title={rightOpen ? 'Hide requirements (Ctrl+I)' : 'Show requirements (Ctrl+I)'}
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {activeConversationId && (
            <RequirementIntake
              projectId={projectId}
              conversationId={activeConversationId}
              onGenerateArchitecture={onGenerateArchitecture}
            />
          )}
        </div>
      </div>

      {/* Right panel: Requirement JSON / Version history */}
      <div
        className={cn(
          'shrink-0 overflow-hidden border-l border-border-subtle transition-all duration-300 ease-in-out',
          rightOpen ? 'w-80' : 'w-0',
        )}
      >
        {rightOpen &&
          (showVersions ? (
            <VersionHistory projectId={projectId} onClose={() => setShowVersions(false)} />
          ) : (
            <RequirementPanel projectId={projectId} onShowVersions={() => setShowVersions(true)} />
          ))}
      </div>
    </div>
  );
}
