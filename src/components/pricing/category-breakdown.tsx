"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { CategoryCostGroup, PricingCategory } from '@/types';
import { useCurrency } from '@/hooks/use-currency';

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
  /** Customer's original currency to display in. */
  currency?: string;
}

export function CategoryBreakdown({ categories, currency = 'USD' }: CategoryBreakdownProps) {
  const { formatFromUsd } = useCurrency();
  const formatUsd = (n: number) => formatFromUsd(n, currency);
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
                    `${formatUsd(Number(Array.isArray(value) ? value[0] : value ?? 0))} / mo`,
                    'Estimated cost',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

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
                    {formatUsd(c.monthlyCost)}/mo
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
