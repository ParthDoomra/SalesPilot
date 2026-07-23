/**
 * useAnalyticsData — derives every live Analytics metric from the app's
 * persisted client state. No hardcoded/placeholder values.
 *
 * Sources (all localStorage-persisted zustand stores):
 *   • useProjectsStore            → projects, statuses, monthly estimates
 *   • useProjectArchitectureStore → selected architecture per project
 *   • useProjectPricingStore      → generated pricing reports per project
 *   • useProjectProposalStore     → proposal version history per project
 *   • useActivityStore            → recorded activity (requirement analysis, …)
 *
 * All spend figures are USD (the internal calculation currency) so cross-project
 * totals never sum mixed currencies. A `ready` flag defers the first render to
 * after mount to avoid a hydration mismatch when the stores rehydrate.
 */

"use client";

import * as React from "react";
import { useProjectsStore } from "@/lib/projects-store";
import { useProjectArchitectureStore } from "@/lib/project-architecture-store";
import { useProjectPricingStore } from "@/lib/project-pricing-store";
import { useProjectProposalStore } from "@/lib/project-proposal-store";
import { useActivityStore } from "@/lib/activity-store";
import { getProjectMonthlyUsd, syncAllProjectsFromPricingStore } from "@/lib/project-currency";

const ANALYTICS_CURRENCY = "USD";

export interface CustomerSpend {
  customer: string;
  monthlyUsd: number;
  projectCount: number;
}

export interface ProjectSpend {
  id: string;
  name: string;
  customer: string;
  monthlyUsd: number;
}

export interface AnalyticsActivityItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  source: "ai" | "user";
  time: string;
}

export interface TrendPoint {
  month: string;
  cost: number;
}

export interface AnalyticsData {
  ready: boolean;
  currency: string;
  hasAnyProjects: boolean;
  totalProjects: number;
  activeProjects: number;
  totalMonthlyUsd: number;
  totalAIGenerations: number;
  requirementsAnalyzed: number;
  architecturesGenerated: number;
  pricingReportsGenerated: number;
  proposalsGenerated: number;
  topCustomers: CustomerSpend[];
  topProjects: ProjectSpend[];
  recentActivity: AnalyticsActivityItem[];
  spendTrend: TrendPoint[];
}

const EMPTY: AnalyticsData = {
  ready: false,
  currency: ANALYTICS_CURRENCY,
  hasAnyProjects: false,
  totalProjects: 0,
  activeProjects: 0,
  totalMonthlyUsd: 0,
  totalAIGenerations: 0,
  requirementsAnalyzed: 0,
  architecturesGenerated: 0,
  pricingReportsGenerated: 0,
  proposalsGenerated: 0,
  topCustomers: [],
  topProjects: [],
  recentActivity: [],
  spendTrend: [],
};

/** Cumulative "monthly cloud spend under management" over the last 6 months. */
function buildSpendTrend(entries: Array<{ createdAt: string; monthlyUsd: number }>): TrendPoint[] {
  const withCost = entries.filter((e) => e.monthlyUsd > 0);
  if (withCost.length === 0) return [];

  const now = new Date();
  const points: TrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
    const cost = withCost
      .filter((e) => {
        const t = new Date(e.createdAt).getTime();
        return !Number.isNaN(t) && t <= monthEnd.getTime();
      })
      .reduce((sum, e) => sum + e.monthlyUsd, 0);
    points.push({ month: monthStart.toLocaleDateString("en-US", { month: "short" }), cost });
  }
  return points;
}

export function useAnalyticsData(): AnalyticsData {
  const projects = useProjectsStore((s) => s.projects);
  const architectureByProject = useProjectArchitectureStore((s) => s.byProject);
  const pricingByProject = useProjectPricingStore((s) => s.byProject);
  const proposalByProject = useProjectProposalStore((s) => s.byProject);
  const activityByProject = useActivityStore((s) => s.byProject);

  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  // Backfill project currency + monthly estimates from persisted pricing reports.
  React.useEffect(() => {
    if (!ready) return;
    syncAllProjectsFromPricingStore();
  }, [ready, pricingByProject]);

  return React.useMemo<AnalyticsData>(() => {
    if (!ready) return EMPTY;

    const visible = projects.filter((p) => !p.archived);
    const visibleIds = new Set(visible.map((p) => p.id));
    const nameOf = (pid: string) => visible.find((p) => p.id === pid)?.name ?? "Project";

    const active = visible.filter((p) => p.status !== "Won" && p.status !== "Lost");

    // Per-project USD monthly estimate (single currency — never mixed).
    const monthlyUsdOf = (p: (typeof visible)[number]) =>
      getProjectMonthlyUsd(p, pricingByProject[p.id] ?? null);

    const totalMonthlyUsd = visible
      .filter((p) => p.monthlyEstimate > 0)
      .reduce((sum, p) => sum + monthlyUsdOf(p), 0);

    // AI generation counts.
    const requirementsAnalyzed = Object.entries(activityByProject).reduce(
      (sum, [pid, events]) =>
        sum + (visibleIds.has(pid) ? events.filter((e) => e.type === "requirement_analysis").length : 0),
      0,
    );
    const architecturesGenerated = Object.keys(architectureByProject).filter((pid) =>
      visibleIds.has(pid),
    ).length;
    const pricingReportsGenerated = Object.keys(pricingByProject).filter((pid) =>
      visibleIds.has(pid),
    ).length;
    const proposalsGenerated = Object.entries(proposalByProject).reduce(
      (sum, [pid, versions]) => sum + (visibleIds.has(pid) ? versions.length : 0),
      0,
    );
    const totalAIGenerations =
      requirementsAnalyzed + architecturesGenerated + pricingReportsGenerated + proposalsGenerated;

    // Top customers by estimated monthly spend.
    const byCustomer = new Map<string, CustomerSpend>();
    for (const p of visible) {
      const usd = monthlyUsdOf(p);
      if (usd <= 0) continue;
      const entry = byCustomer.get(p.customer) ?? { customer: p.customer, monthlyUsd: 0, projectCount: 0 };
      entry.monthlyUsd += usd;
      entry.projectCount += 1;
      byCustomer.set(p.customer, entry);
    }
    const topCustomers = [...byCustomer.values()]
      .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
      .slice(0, 5);

    // Top projects by estimated monthly spend.
    const topProjects: ProjectSpend[] = visible
      .map((p) => ({ id: p.id, name: p.name, customer: p.customer, monthlyUsd: monthlyUsdOf(p) }))
      .filter((p) => p.monthlyUsd > 0)
      .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
      .slice(0, 5);

    // Recent AI activity — recorded events + derived generation events.
    const activityItems: AnalyticsActivityItem[] = [];
    for (const [pid, events] of Object.entries(activityByProject)) {
      if (!visibleIds.has(pid)) continue;
      for (const e of events) {
        activityItems.push({
          id: e.id,
          title: e.title,
          projectId: pid,
          projectName: nameOf(pid),
          source: e.source,
          time: e.timestamp,
        });
      }
    }
    for (const [pid, arch] of Object.entries(architectureByProject)) {
      if (!visibleIds.has(pid) || !arch) continue;
      activityItems.push({
        id: `arch_${pid}`,
        title: "Architecture generated",
        projectId: pid,
        projectName: nameOf(pid),
        source: "ai",
        time: arch.createdAt,
      });
    }
    for (const [pid, est] of Object.entries(pricingByProject)) {
      if (!visibleIds.has(pid) || !est) continue;
      activityItems.push({
        id: `price_${pid}`,
        title: "Pricing report generated",
        projectId: pid,
        projectName: nameOf(pid),
        source: "ai",
        time: est.generatedAt,
      });
    }
    for (const [pid, versions] of Object.entries(proposalByProject)) {
      if (!visibleIds.has(pid)) continue;
      for (const v of versions) {
        activityItems.push({
          id: `prop_${v.id}`,
          title: `Proposal generated (v${v.version})`,
          projectId: pid,
          projectName: nameOf(pid),
          source: "ai",
          time: v.createdAt,
        });
      }
    }
    const recentActivity = activityItems
      .sort((a, b) => {
        const ta = new Date(a.time).getTime();
        const tb = new Date(b.time).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      })
      .slice(0, 8);

    // Monthly spend trend (cumulative, by project creation month).
    const spendTrend = buildSpendTrend(
      visible.map((p) => ({ createdAt: p.createdAt, monthlyUsd: monthlyUsdOf(p) })),
    );

    return {
      ready: true,
      currency: ANALYTICS_CURRENCY,
      hasAnyProjects: visible.length > 0,
      totalProjects: visible.length,
      activeProjects: active.length,
      totalMonthlyUsd,
      totalAIGenerations,
      requirementsAnalyzed,
      architecturesGenerated,
      pricingReportsGenerated,
      proposalsGenerated,
      topCustomers,
      topProjects,
      recentActivity,
      spendTrend,
    };
  }, [ready, projects, architectureByProject, pricingByProject, proposalByProject, activityByProject]);
}
