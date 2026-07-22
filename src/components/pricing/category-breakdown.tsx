/**
 * CategoryBreakdown — donut chart + itemised list of estimated monthly cost
 * grouped by category (Compute, Database, Storage, …).
 */

"use client";

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { CategoryCostGroup, PricingCategory } from '@/types';
import { formatMoney } from './format';

/** Mid-tone categorical palette — legible on both light and dark themes. */
const CATEGORY_COLORS: Record<PricingCategory, string> = {
  Compute: '#3b82f6',
  Database: '#f59e0b',
  Storage: '#10b981',
  Networking: '#8b5cf6',
  Security: '#ef4444',
  Backup: '#06b6d4',
  Monitoring: '#eab308',
};

interface CategoryBreakdownProps {
  categories: CategoryCostGroup[];
  currencySymbol: string;
}

export function CategoryBreakdown({ categories, currencySymbol }: CategoryBreakdownProps) {
  const chartData = categories.map((c) => ({
    name: c.category,
    value: c.monthlyCost,
    fill: CATEGORY_COLORS[c.category],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated cost by category</CardTitle>
        <CardDescription>Monthly estimate grouped across cloud service categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
          {/* Donut */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `${formatMoney(Number(Array.isArray(value) ? value[0] : value ?? 0), currencySymbol)} / mo`,
                    'Estimated cost',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / list */}
          <div className="space-y-2.5">
            {categories.map((c) => (
              <div key={c.category} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: CATEGORY_COLORS[c.category] }}
                    />
                    {c.category}
                  </span>
                  <span className="font-mono-data text-muted-foreground">
                    {formatMoney(c.monthlyCost, currencySymbol)}/mo
                    <span className="ml-1.5 text-muted-foreground/60">({c.percentage}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.percentage}%`, background: CATEGORY_COLORS[c.category] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
