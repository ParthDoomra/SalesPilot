"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function AIActivityWidget() {
  const { totalAIGenerations, architectureCount, pricingReportCount, proposalCount } = useDashboardData();

  const rows = [
    { label: "Architectures generated", value: architectureCount },
    { label: "Pricing reports", value: pricingReportCount },
    { label: "Proposals", value: proposalCount },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-signal" /> AI activity
        </CardTitle>
        <CardDescription>AI generations across the workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-foreground">{totalAIGenerations}</span>
          <span className="text-xs text-muted-foreground">total AI generations</span>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-mono-data font-medium text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentConversationsWidget() {
  const { recentConversations } = useDashboardData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent conversations</CardTitle>
        <CardDescription>Latest AI Workspace threads</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {recentConversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No AI conversations yet.</p>
          </div>
        ) : (
          recentConversations.map((c) => (
            <Link key={c.id} href={`/projects/${c.projectId}`} className="text-sm hover:text-signal">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{c.title || "Untitled conversation"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{c.messageCount} msg</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.updatedAt}</p>
            </Link>
          ))
        )}
        <Link href="/ai-workspace" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
          Open AI Workspace <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
