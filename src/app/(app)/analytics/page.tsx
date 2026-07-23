"use client";

/**
 * Analytics — live pipeline, AI usage, and spend across all projects.
 *
 * Metrics come from `useAnalyticsData` (persisted app stores). Charts reuse the
 * existing self-contained dashboard components where they already render live
 * data; the spend trend is derived live here. Every section has its own empty
 * state, and the whole page shows an empty state when there are no projects.
 */

import * as React from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  FolderKanban,
  Rocket,
  DollarSign,
  Sparkles,
  FileSearch,
  Network,
  Calculator,
  FileText,
  Users,
  TrendingUp,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { CloudProviderDistribution, ArchitectureTypeDistribution } from "@/components/dashboard/distributions";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useCurrency } from "@/hooks/use-currency";

function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const data = useAnalyticsData();
  const { format } = useCurrency();
  const { ready, currency } = data;

  return (
    <div>
      <PageHeader title="Analytics" description="Live pipeline, AI usage, and cloud spend across your projects." />

      {!ready ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse p-5" />
          ))}
        </div>
      ) : !data.hasAnyProjects ? (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-medium">No analytics yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first project and generate requirements, architecture, pricing, and proposals to
            see live analytics here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Headline metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FolderKanban} label="Total projects" value={String(data.totalProjects)} sub="active + in pipeline" />
            <StatCard icon={Rocket} label="Active projects" value={String(data.activeProjects)} sub="not won or lost" />
            <StatCard
              icon={DollarSign}
              label="Total Estimated Monthly Cloud Spend (USD)"
              value={format(data.totalMonthlyUsd, currency)}
              sub="sum of selected architectures"
            />
            <StatCard icon={Sparkles} label="Total AI generations" value={String(data.totalAIGenerations)} sub="requirements, architecture, pricing, proposals" />
          </div>

          {/* AI generation breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FileSearch} label="Requirements analyzed" value={String(data.requirementsAnalyzed)} sub="AI requirement extractions" />
            <StatCard icon={Network} label="Architectures generated" value={String(data.architecturesGenerated)} sub="projects with a solution" />
            <StatCard icon={Calculator} label="Pricing reports generated" value={String(data.pricingReportsGenerated)} sub="cost estimates produced" />
            <StatCard icon={FileText} label="Proposals generated" value={String(data.proposalsGenerated)} sub="across all versions" />
          </div>

          {/* Trend + pipeline */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly cloud spend trend</CardTitle>
                <CardDescription>Cumulative estimated monthly spend under management (USD)</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pl-0">
                {data.spendTrend.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-5">
                    <p className="text-sm text-muted-foreground">
                      No priced projects yet — generate pricing to see the spend trend.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.spendTrend} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsCostFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${format(Number(v) / 1000, currency, { maximumFractionDigits: 1 })}k`}
                        width={54}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-surface-raised)",
                          border: "1px solid var(--color-border-default)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value) => [
                          format(Number(Array.isArray(value) ? value[0] : value ?? 0), currency),
                          "Estimated spend",
                        ]}
                      />
                      <Area type="monotone" dataKey="cost" stroke="var(--color-signal)" strokeWidth={2} fill="url(#analyticsCostFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <PipelineChart />
          </div>

          {/* Distributions (reused live dashboard components) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CloudProviderDistribution />
            <ArchitectureTypeDistribution />
          </div>

          {/* Top customers / projects / activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-signal" /> Top customers
                </CardTitle>
                <CardDescription>By estimated monthly spend</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {data.topCustomers.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">No priced projects yet.</p>
                ) : (
                  data.topCustomers.map((c) => (
                    <div key={c.customer} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.customer}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.projectCount} project{c.projectCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="font-mono-data text-sm font-semibold text-foreground">
                        {format(c.monthlyUsd, currency)}
                        <span className="text-[10px] font-normal text-muted-foreground"> /mo</span>
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-signal" /> Most expensive projects
                </CardTitle>
                <CardDescription>Top 5 by monthly estimate</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {data.topProjects.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">No priced projects yet.</p>
                ) : (
                  data.topProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-raised"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.customer}</div>
                      </div>
                      <span className="font-mono-data text-sm font-semibold text-foreground">
                        {format(p.monthlyUsd, currency)}
                        <span className="text-[10px] font-normal text-muted-foreground"> /mo</span>
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4 text-signal" /> Recent AI activity
                </CardTitle>
                <CardDescription>Latest generations across projects</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="relative space-y-4 border-l border-border-subtle pl-4">
                    {data.recentActivity.map((a) => (
                      <div key={a.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border border-signal bg-background ring-2 ring-signal-soft" />
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/projects/${a.projectId}`} className="truncate text-sm font-medium hover:text-signal">
                            {a.title}
                          </Link>
                          <span className="shrink-0 text-[10px] text-muted-foreground/60">{fmtTime(a.time)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              a.source === "ai" ? "bg-signal-soft text-signal" : "bg-surface-raised text-muted-foreground"
                            }`}
                          >
                            {a.source === "ai" ? "AI" : "You"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{a.projectName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
