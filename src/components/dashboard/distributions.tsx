"use client";

import { Cloud, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDashboardData, type DistributionEntry } from "@/hooks/use-dashboard-data";

const PROVIDER_COLORS: Record<string, string> = {
  AWS: "#f59e0b",
  Azure: "#3b82f6",
  GCP: "#10b981",
};

const TYPE_COLORS: Record<string, string> = {
  Balanced: "#3b82f6",
  Performance: "#8b5cf6",
  Budget: "#10b981",
};

function DistributionBars({ data, colors }: { data: DistributionEntry[]; colors: Record<string, string> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={d.name} className="text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[d.name] ?? "var(--color-signal)" }} />
                {d.name}
              </span>
              <span className="font-mono-data text-muted-foreground">
                {d.value}
                <span className="ml-1.5 text-muted-foreground/60">({pct}%)</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[d.name] ?? "var(--color-signal)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CloudProviderDistribution() {
  const { providerDistribution } = useDashboardData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-signal" /> Cloud provider distribution
        </CardTitle>
        <CardDescription>Across generated architectures</CardDescription>
      </CardHeader>
      <CardContent>
        {providerDistribution.length === 0 ? (
          <p className="text-xs text-muted-foreground">No architectures generated yet.</p>
        ) : (
          <DistributionBars data={providerDistribution} colors={PROVIDER_COLORS} />
        )}
      </CardContent>
    </Card>
  );
}

export function ArchitectureTypeDistribution() {
  const { architectureTypeDistribution } = useDashboardData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-signal" /> Architecture type distribution
        </CardTitle>
        <CardDescription>Balanced · Performance · Budget</CardDescription>
      </CardHeader>
      <CardContent>
        {architectureTypeDistribution.length === 0 ? (
          <p className="text-xs text-muted-foreground">No architectures selected yet.</p>
        ) : (
          <DistributionBars data={architectureTypeDistribution} colors={TYPE_COLORS} />
        )}
      </CardContent>
    </Card>
  );
}
