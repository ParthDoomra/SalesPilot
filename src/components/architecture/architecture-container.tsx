/**
 * ArchitectureContainer — Main view orchestrating the Phase 3 Solution Architecture Generator.
 */

"use client";

import * as React from 'react';
import { Sparkles, Loader2, Download, Layout, Calculator, Check } from 'lucide-react';
import { useArchitecture } from '@/hooks/use-architecture';
import { OptionCompareCards } from './option-compare-cards';
import { ArchitectureCanvas } from './architecture-canvas';
import { ServiceCardList } from './service-card-list';
import { CompatibilityWarningPanel } from './compatibility-warning-panel';
import { DecisionPanel } from './decision-panel';
import { ExportDialog } from './export-dialog';
import { ArchitectureTimeline } from './architecture-timeline';
import type { CloudProvider } from '@/types';

interface ArchitectureContainerProps {
  projectId: string;
  /**
   * Called when the user clicks "Generate Pricing" for the selected architecture.
   * The parent navigates to the Pricing tab, which auto-generates the report from
   * the persisted selected architecture + the requirement.
   */
  onGeneratePricing?: () => void;
}

export function ArchitectureContainer({ projectId, onGeneratePricing }: ArchitectureContainerProps) {
  const {
    architecture,
    selectedOptionId,
    selectedProvider,
    isGenerating,
    isUpdating,
    error,
    exportOpen,
    versions,
    generate,
    selectOption,
    selectProvider,
    setExportOpen,
  } = useArchitecture(projectId);

  const [activeTab, setActiveTab] = React.useState<'canvas' | 'services'>('canvas');

  const selectedOption = architecture?.options.find((o) => o.id === selectedOptionId) || architecture?.options[0];

  // The selection is already persisted to the project state (via selectOption).
  // "Generate Pricing" just confirms it and hands off to the Pricing module.
  const handleGeneratePricing = React.useCallback(() => {
    if (selectedOption) selectOption(selectedOption.id);
    onGeneratePricing?.();
  }, [selectedOption, selectOption, onGeneratePricing]);

  return (
    <div className="space-y-6">
      {/* 1. Header and Generation trigger */}
      <div className="flex flex-col justify-between gap-4 border-b border-border-subtle/50 pb-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Cloud Architecture Specification
          </h3>
          <p className="text-xs text-muted-foreground">
            {architecture
              ? `Generated solution using ${architecture.selectedProvider} parameters.`
              : 'Analyze Requirement JSON and build cloud architecture options.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {architecture && (
            <select
              value={selectedProvider || 'Azure'}
              onChange={(e) => selectProvider(e.target.value as CloudProvider)}
              disabled={isGenerating || isUpdating}
              className="rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium focus:border-signal focus:outline-none"
            >
              <option value="Azure">Azure</option>
              <option value="AWS">AWS</option>
              <option value="GCP">GCP</option>
            </select>
          )}

          <button
            onClick={() => generate()}
            disabled={isGenerating || isUpdating}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing requirements…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Generate Architecture</>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          {error}
        </div>
      )}

      {/* No architecture state */}
      {!architecture && !isGenerating && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <Layout className="h-6 w-6" />
          </div>
          <h4 className="mt-4 font-display text-base font-semibold">No Architecture Solution Yet</h4>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
            Complete the customer requirement interview in the Conversation tab, then generate cloud architecture alternatives.
          </p>
          <button
            onClick={() => generate()}
            className="mt-5 flex mx-auto items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate Options Now
          </button>
        </div>
      )}

      {/* Active Generating state loader */}
      {isGenerating && !architecture && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface">
          <Loader2 className="h-8 w-8 animate-spin text-signal" />
          <span className="text-xs text-muted-foreground animate-pulse">
            Cloud Decision Engine parsing requirements and provisioning service nodes…
          </span>
        </div>
      )}

      {/* Main Architecture Content */}
      {architecture && selectedOption && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            {/* Compatibility Warning banner */}
            <CompatibilityWarningPanel warnings={architecture.compatibilityWarnings} />

            {/* 2. Three options comparison cards */}
            <div>
              <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Architectural Alternatives
              </h4>
              <OptionCompareCards
                options={architecture.options}
                selectedId={selectedOptionId}
                onSelect={selectOption}
                isUpdating={isUpdating}
              />

              {/* Selected architecture + hand-off to Pricing */}
              {selectedOption && (
                <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-signal/30 bg-signal-soft/10 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-signal-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-muted-foreground">
                      Selected architecture:{' '}
                      <strong className="text-foreground">{selectedOption.name}</strong>{' '}
                      ({architecture.selectedProvider})
                    </span>
                  </div>
                  <button
                    onClick={handleGeneratePricing}
                    disabled={isGenerating || isUpdating}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 shadow-sm disabled:opacity-50"
                  >
                    <Calculator className="h-3.5 w-3.5" /> Generate Pricing
                  </button>
                </div>
              )}
            </div>

            {/* 3. Visual Flow vs Services tab view */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('canvas')}
                    className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeTab === 'canvas'
                        ? 'border-signal text-signal'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Visual Canvas Flow
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeTab === 'services'
                        ? 'border-signal text-signal'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Services & Rationales ({selectedOption.services.length})
                  </button>
                </div>

                <button
                  onClick={() => setExportOpen(true)}
                  className="flex items-center gap-1 rounded-md border border-border-default bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-signal/50"
                >
                  <Download className="h-3 w-3" /> Export Specs
                </button>
              </div>

              {activeTab === 'canvas' ? (
                <ArchitectureCanvas
                  nodes={selectedOption.visualFlowNodes}
                  provider={architecture.selectedProvider}
                />
              ) : (
                <ServiceCardList services={selectedOption.services} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {/* 4. Decision Engine log */}
            <DecisionPanel
              logs={architecture.decisionLogs}
              recommendations={architecture.recommendations}
              selectedProvider={architecture.selectedProvider}
            />

            {/* 5. Version History */}
            <ArchitectureTimeline architecture={architecture} versions={versions} />
          </div>
        </div>
      )}

      {/* Export specs modal dialog */}
      {architecture && selectedOption && (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          projectId={projectId}
          optionId={selectedOption.id}
        />
      )}
    </div>
  );
}
