/**
 * useDashboardData — derives every live dashboard metric from the app's
 * persisted client state. No hardcoded/placeholder values.
 *
 * Sources (all localStorage-persisted zustand stores):
 *   • useProjectsStore            → projects, statuses, monthly estimates
 *   • useProjectArchitectureStore → selected architecture per project
 *   • useConversationStore        → AI conversations
 *
 * A `ready` flag defers the first client render until after mount so the
 * server-rendered (empty) markup matches, avoiding hydration mismatch when the
 * persisted stores rehydrate from localStorage.
 */

"use client";

import * as React from 'react';
import { useProjectsStore } from '@/lib/projects-store';
import { useProjectArchitectureStore } from '@/lib/project-architecture-store';
import { useProjectPricingStore } from '@/lib/project-pricing-store';
import { useConversationStore } from '@/features/workspace/stores/conversation-store';
import { getProjectMonthlyUsd, syncAllProjectsFromPricingStore } from '@/lib/project-currency';
import { getCurrencySymbol } from '@/services/currency';

/**
 * Dashboard analytics are always expressed in USD — the internal calculation
 * currency — so cross-project totals never sum mixed currencies. Per-customer
 * original currency is shown on the Projects/Pricing/Proposal pages, not here.
 */
const ANALYTICS_CURRENCY = 'USD';
import type { Project } from '@/lib/types';
import type { ArchitectureModel, Conversation } from '@/types';

export type PipelineStage = 'Discovery' | 'Architecture' | 'Pricing' | 'Proposal' | 'Completed';

export const PIPELINE_STAGES: PipelineStage[] = ['Discovery', 'Architecture', 'Pricing', 'Proposal', 'Completed'];

export interface DistributionEntry {
  name: string;
  value: number;
}

export interface PricingReportEntry {
  projectId: string;
  name: string;
  customer: string;
  monthlyEstimate: number;
  currencyCode: string;
  currencySymbol: string;
}

export interface ActivityEntry {
  projectId: string;
  title: string;
  detail: string;
  stage: PipelineStage;
  time: string;
}

export interface DashboardData {
  ready: boolean;
  hasAnyProjects: boolean;
  hasAnyArchitectures: boolean;
  activeProjectCount: number;
  totalMonthlyCost: number;
  costCurrency: string;
  costCurrencySymbol: string;
  totalAIGenerations: number;
  architectureCount: number;
  pricingReportCount: number;
  proposalCount: number;
  pipeline: Array<{ stage: PipelineStage; count: number }>;
  recentProjects: Project[];
  recentConversations: Conversation[];
  providerDistribution: DistributionEntry[];
  architectureTypeDistribution: DistributionEntry[];
  latestPricingReports: PricingReportEntry[];
  latestProposals: Project[];
  activity: ActivityEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  balanced: 'Balanced',
  performance: 'Performance',
  budget: 'Budget',
};

/** Derives a project's current pipeline stage from its artifacts. */
function stageOf(project: Project, arch: ArchitectureModel | undefined): PipelineStage {
  if (project.status === 'Won' || project.proposalStatus === 'Approved') return 'Completed';
  if (project.proposalStatus !== 'Not Started' || project.status === 'Proposal Sent') return 'Proposal';
  if (project.monthlyEstimate > 0) return 'Pricing';
  if (arch) return 'Architecture';
  return 'Discovery';
}

function sortByUpdatedDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

export function useDashboardData(): DashboardData {
  const projects = useProjectsStore((s) => s.projects);
  const byProject = useProjectArchitectureStore((s) => s.byProject);
  const pricingByProject = useProjectPricingStore((s) => s.byProject);
  const conversations = useConversationStore((s) => s.conversations);

  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  // Backfill project currency + monthly estimates from persisted pricing reports.
  React.useEffect(() => {
    if (!ready) return;
    syncAllProjectsFromPricingStore();
  }, [ready, pricingByProject]);

  return React.useMemo<DashboardData>(() => {
    // Before mount, render an empty shape so SSR and first client render match.
    if (!ready) {
      return {
        ready: false,
        hasAnyProjects: false,
        hasAnyArchitectures: false,
        activeProjectCount: 0,
        totalMonthlyCost: 0,
        costCurrency: 'USD',
        costCurrencySymbol: getCurrencySymbol('USD'),
        totalAIGenerations: 0,
        architectureCount: 0,
        pricingReportCount: 0,
        proposalCount: 0,
        pipeline: PIPELINE_STAGES.map((stage) => ({ stage, count: 0 })),
        recentProjects: [],
        recentConversations: [],
        providerDistribution: [],
        architectureTypeDistribution: [],
        latestPricingReports: [],
        latestProposals: [],
        activity: [],
      };
    }

    const visible = projects.filter((p) => !p.archived);
    const active = visible.filter((p) => p.status !== 'Won' && p.status !== 'Lost');

    // Totals are the sum of every active project's USD estimate — a single,
    // consistent currency, so no mixed-currency summing ever occurs.
    const activeWithEstimates = active.filter((p) => p.monthlyEstimate > 0);
    const totalMonthlyCost = activeWithEstimates.reduce(
      (sum, p) => sum + getProjectMonthlyUsd(p, pricingByProject[p.id] ?? null),
      0,
    );
    const costCurrency = ANALYTICS_CURRENCY;
    const costCurrencySymbol = getCurrencySymbol(ANALYTICS_CURRENCY);

    // Pipeline by stage (over visible projects)
    const pipelineCounts: Record<PipelineStage, number> = {
      Discovery: 0, Architecture: 0, Pricing: 0, Proposal: 0, Completed: 0,
    };
    for (const p of visible) pipelineCounts[stageOf(p, byProject[p.id])]++;
    const pipeline = PIPELINE_STAGES.map((stage) => ({ stage, count: pipelineCounts[stage] }));

    // Architecture-derived distributions
    const architectures = Object.values(byProject);
    const providerCounts: Record<string, number> = { AWS: 0, Azure: 0, GCP: 0 };
    const typeCounts: Record<string, number> = { balanced: 0, performance: 0, budget: 0 };
    let generations = 0;
    for (const arch of architectures) {
      if (arch.selectedProvider in providerCounts) providerCounts[arch.selectedProvider]++;
      const opt = arch.options.find((o) => o.id === arch.selectedOptionId) ?? arch.options[0];
      if (opt && opt.type in typeCounts) typeCounts[opt.type]++;
      generations += Math.max(1, arch.version || 1);
    }
    const providerDistribution = Object.entries(providerCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
    const architectureTypeDistribution = Object.entries(typeCounts)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({ name: TYPE_LABELS[type] ?? type, value }));

    // Pricing reports & proposals (real: monthlyEstimate is synced from the pricing report)
    const pricingProjects = visible.filter((p) => p.monthlyEstimate > 0);
    const latestPricingReports: PricingReportEntry[] = sortByUpdatedDesc(pricingProjects)
      .slice(0, 4)
      .map((p) => ({
        projectId: p.id,
        name: p.name,
        customer: p.customer,
        // Dashboard analytics are reported in USD.
        monthlyEstimate: getProjectMonthlyUsd(p, pricingByProject[p.id] ?? null),
        currencyCode: ANALYTICS_CURRENCY,
        currencySymbol: getCurrencySymbol(ANALYTICS_CURRENCY),
      }));

    const proposalProjects = visible.filter((p) => p.proposalStatus !== 'Not Started');
    const latestProposals = sortByUpdatedDesc(proposalProjects).slice(0, 4);

    // Recent activity timeline (derived from real project state + timestamps)
    const activity: ActivityEntry[] = sortByUpdatedDesc(visible)
      .slice(0, 6)
      .map((p) => {
        const stage = stageOf(p, byProject[p.id]);
        return {
          projectId: p.id,
          title: p.name,
          detail: stage === 'Completed' ? 'Marked complete' : `Now at ${stage} stage`,
          stage,
          time: p.updatedAt,
        };
      });

    return {
      ready: true,
      hasAnyProjects: visible.length > 0,
      hasAnyArchitectures: architectures.length > 0,
      activeProjectCount: active.length,
      totalMonthlyCost,
      costCurrency,
      costCurrencySymbol,
      totalAIGenerations: generations,
      architectureCount: architectures.length,
      pricingReportCount: pricingProjects.length,
      proposalCount: proposalProjects.length,
      pipeline,
      recentProjects: sortByUpdatedDesc(visible).slice(0, 5),
      recentConversations: sortByUpdatedDesc(conversations).slice(0, 4),
      providerDistribution,
      architectureTypeDistribution,
      latestPricingReports,
      latestProposals,
      activity,
    };
  }, [ready, projects, byProject, pricingByProject, conversations]);
}
