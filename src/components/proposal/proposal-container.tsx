/**
 * ProposalContainer — Phase 5 view.
 *
 * Automatically assembles a presentation-ready client proposal from the
 * Requirement (Phase 2), the selected Architecture (Phase 3), and the Pricing
 * report (Phase 4). The user never re-enters data. Offers Generate / Export PDF
 * / Print / Download actions.
 */

"use client";

import * as React from 'react';
import { Loader2, FileText, RefreshCw, Printer, Download, FileDown, Layout } from 'lucide-react';
import { useProposal } from '@/hooks/use-proposal';
import { ProposalDocument } from './proposal-document';
import { openProposalPrintWindow, downloadProposalHtml } from '@/lib/proposal-export';

interface ProposalContainerProps {
  projectId: string;
}

export function ProposalContainer({ projectId }: ProposalContainerProps) {
  const { proposal, isLoading, error, hasGenerated, reason, hasArchitecture, generate } = useProposal(projectId);

  // Auto-generate from the selected architecture as soon as the tab mounts.
  React.useEffect(() => {
    if (hasArchitecture && !hasGenerated && !isLoading) {
      generate();
    }
  }, [hasArchitecture, hasGenerated, isLoading, generate]);

  const noArchitecture = !hasArchitecture || (hasGenerated && !proposal && reason === 'no-architecture');
  const showLoading = isLoading || (hasArchitecture && !hasGenerated);

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-border-subtle/50 pb-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Client Proposal</h3>
          <p className="text-xs text-muted-foreground">
            {proposal
              ? `Presentation-ready proposal for ${proposal.executiveSummary.customerName}.`
              : 'Auto-generated from the requirement, selected architecture, and pricing report.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generate}
            disabled={isLoading || !hasArchitecture}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {proposal ? 'Regenerate Proposal' : 'Generate Proposal'}
          </button>
          <button
            onClick={() => proposal && openProposalPrintWindow(proposal, true)}
            disabled={!proposal}
            className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-signal/50 disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button
            onClick={() => proposal && openProposalPrintWindow(proposal, true)}
            disabled={!proposal}
            className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-signal/50 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print Proposal
          </button>
          <button
            onClick={() => proposal && downloadProposalHtml(proposal)}
            disabled={!proposal}
            className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-signal/50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Download Proposal
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">{error}</div>
      )}

      {/* Loading (includes the automatic first-generation window) */}
      {showLoading && !noArchitecture && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface">
          <Loader2 className="h-8 w-8 animate-spin text-signal" />
          <span className="text-xs text-muted-foreground animate-pulse">
            Assembling requirement, architecture, and pricing into a proposal…
          </span>
        </div>
      )}

      {/* No architecture — generate one first */}
      {!showLoading && noArchitecture && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <Layout className="h-6 w-6" />
          </div>
          <h4 className="mt-4 font-display text-base font-semibold">No Architecture to Propose</h4>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
            Generate and select a cloud architecture in the Architecture tab first — the proposal is built
            automatically from it, the requirement, and the pricing report.
          </p>
        </div>
      )}

      {/* Fallback CTA (e.g. after an error) */}
      {!showLoading && !proposal && !noArchitecture && !error && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <FileText className="h-6 w-6" />
          </div>
          <h4 className="mt-4 font-display text-base font-semibold">Generate the Proposal</h4>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Build a presentation-ready proposal from the requirement, the selected architecture, and the
            pricing report.
          </p>
        </div>
      )}

      {/* Document */}
      {proposal && !showLoading && <ProposalDocument proposal={proposal} />}
    </div>
  );
}
