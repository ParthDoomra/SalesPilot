"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { ProposalStatus } from "@/lib/types";

const BADGE_VARIANT: Record<ProposalStatus, "default" | "success" | "warning" | "neutral"> = {
  "Not Started": "neutral",
  Draft: "neutral",
  "In Review": "warning",
  Sent: "default",
  Approved: "success",
};

export function RecentProposals() {
  const { latestProposals } = useDashboardData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest proposals</CardTitle>
        <CardDescription>Latest activity across your pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {latestProposals.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">No proposals started yet.</p>
        ) : (
          latestProposals.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 -mx-2 transition-colors hover:bg-surface-raised"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.customer}</div>
              </div>
              <Badge variant={BADGE_VARIANT[p.proposalStatus]}>{p.proposalStatus}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
