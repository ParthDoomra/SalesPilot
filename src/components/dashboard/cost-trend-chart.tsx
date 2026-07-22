"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const DATA = [
  { month: "Feb", cost: 38200 },
  { month: "Mar", cost: 41500 },
  { month: "Apr", cost: 45800 },
  { month: "May", cost: 49100 },
  { month: "Jun", cost: 53400 },
  { month: "Jul", cost: 58600 },
];

export function CostTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated monthly cost</CardTitle>
        <CardDescription>Combined pipeline estimate across active projects</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v) => `$${v / 1000}k`}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`$${Number(Array.isArray(value) ? value[0] : value ?? 0).toLocaleString()}`, "Estimated cost"]}
            />
            <Area type="monotone" dataKey="cost" stroke="var(--color-signal)" strokeWidth={2} fill="url(#costFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
