import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEED_PROJECTS } from "@/lib/mock-data";
import type { ProposalStatus } from "@/lib/types";

const BADGE_VARIANT: Record<ProposalStatus, "default" | "success" | "warning" | "neutral"> = {
  "Not Started": "neutral",
  Draft: "neutral",
  "In Review": "warning",
  Sent: "default",
  Approved: "success",
};

export function RecentProposals() {
  const recent = [...SEED_PROJECTS]
    .filter((p) => p.proposalStatus !== "Not Started")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent proposals</CardTitle>
        <CardDescription>Latest activity across your pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {recent.map((p) => (
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
        ))}
      </CardContent>
    </Card>
  );
}
