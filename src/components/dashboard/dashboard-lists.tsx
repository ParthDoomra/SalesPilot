"use client";

import Link from "next/link";
import { FolderKanban, DollarSign, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { useDashboardData, type PipelineStage } from "@/hooks/use-dashboard-data";
import { useCurrency } from "@/hooks/use-currency";

const STAGE_VARIANT: Record<PipelineStage, "default" | "success" | "warning" | "neutral"> = {
  Discovery: "neutral",
  Architecture: "default",
  Pricing: "warning",
  Proposal: "default",
  Completed: "success",
};

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-4 text-center text-xs text-muted-foreground">{children}</p>;
}

export function RecentProjects() {
  const { recentProjects } = useDashboardData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-signal" /> Recent projects
        </CardTitle>
        <CardDescription>Most recently updated</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {recentProjects.length === 0 ? (
          <EmptyRow>No projects yet.</EmptyRow>
        ) : (
          recentProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-raised"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.customer}</div>
              </div>
              <ProjectStatusBadge status={p.archived ? "Archived" : p.status} />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function LatestPricingReports() {
  const { latestPricingReports } = useDashboardData();
  const { format } = useCurrency();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-signal" /> Latest pricing reports
        </CardTitle>
        <CardDescription>Estimated monthly cost per project</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {latestPricingReports.length === 0 ? (
          <EmptyRow>No pricing reports generated yet.</EmptyRow>
        ) : (
          latestPricingReports.map((r) => (
            <Link
              key={r.projectId}
              href={`/projects/${r.projectId}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-raised"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="truncate text-xs text-muted-foreground">{r.customer}</div>
              </div>
              <span className="font-mono-data text-sm font-semibold text-foreground">
                {format(r.monthlyEstimate, r.currencyCode)}
                <span className="text-[10px] font-normal text-muted-foreground"> /mo</span>
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ActivityTimeline() {
  const { activity } = useDashboardData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-signal" /> Recent activity
        </CardTitle>
        <CardDescription>Latest movement across your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyRow>No recent activity.</EmptyRow>
        ) : (
          <div className="relative space-y-4 border-l border-border-subtle pl-4">
            {activity.map((a) => (
              <div key={a.projectId} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border border-signal bg-background ring-2 ring-signal-soft" />
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/projects/${a.projectId}`} className="truncate text-sm font-medium hover:text-signal">
                    {a.title}
                  </Link>
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">{a.time}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant={STAGE_VARIANT[a.stage]}>{a.stage}</Badge>
                  <span className="text-xs text-muted-foreground">{a.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
