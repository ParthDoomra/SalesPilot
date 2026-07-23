"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/use-dashboard-data";

const STAGE_COLORS: Record<string, string> = {
  Discovery: "#64748b",
  Architecture: "#3b82f6",
  Pricing: "#f59e0b",
  Proposal: "#8b5cf6",
  Completed: "#10b981",
};

export function PipelineChart() {
  const { pipeline, hasAnyProjects } = useDashboardData();
  const total = pipeline.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project pipeline by stage</CardTitle>
        <CardDescription>Where your projects sit across the SalesPilot workflow</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pl-0">
        {total === 0 || !hasAnyProjects ? (
          <div className="flex h-full items-center justify-center px-5">
            <p className="text-sm text-muted-foreground">
              No projects yet — create a project to see your pipeline.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipeline} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis dataKey="stage" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "var(--color-surface-raised)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(Array.isArray(value) ? value[0] : value ?? 0)} project(s)`, "Count"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {pipeline.map((s) => (
                  <Cell key={s.stage} fill={STAGE_COLORS[s.stage]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
