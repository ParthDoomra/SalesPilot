"use client";

import { FolderKanban, DollarSign, Sparkles, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useCurrency } from "@/hooks/use-currency";

export function StatCards() {
  const {
    activeProjectCount,
    totalMonthlyCost,
    costCurrency,
    totalAIGenerations,
    proposalCount,
    pricingReportCount,
  } = useDashboardData();
  const { format } = useCurrency();

  const stats = [
    {
      label: "Active projects",
      value: activeProjectCount.toString(),
      sub: "in progress across your pipeline",
      icon: FolderKanban,
    },
    {
      label: "Estimated Monthly Cloud Spend (USD)",
      value: format(totalMonthlyCost, costCurrency),
      sub: "sum of selected architectures",
      icon: DollarSign,
    },
    {
      label: "AI generations",
      value: totalAIGenerations.toString(),
      sub: `${pricingReportCount} pricing report${pricingReportCount === 1 ? "" : "s"} generated`,
      icon: Sparkles,
    },
    {
      label: "Proposals",
      value: proposalCount.toString(),
      sub: "started or sent",
      icon: FileText,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
              <s.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-display text-2xl font-semibold">{s.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
        </Card>
      ))}
    </div>
  );
}
