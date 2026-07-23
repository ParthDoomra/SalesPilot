"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OptionCostEstimate } from '@/types';
import { confidenceTone } from './format';
import { useCurrency } from '@/hooks/use-currency';

interface ResourceCostTableProps {
  option: OptionCostEstimate;
  /** Customer's original currency to display in. */
  currency?: string;
}

export function ResourceCostTable({ option, currency = 'USD' }: ResourceCostTableProps) {
  const { formatFromUsd } = useCurrency();
  const formatUsd = (n: number) => formatFromUsd(n, currency);
  const rows = [...option.resources].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource-level estimated cost</CardTitle>
        <CardDescription>
          Line-item estimates per cloud service — sorted by estimated monthly spend
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-[11px] uppercase tracking-wider text-muted-foreground/60">
                <th className="py-2.5 pr-3 font-medium">Resource</th>
                <th className="py-2.5 pr-3 font-medium">Category</th>
                <th className="py-2.5 pr-3 font-medium text-right">Est. monthly</th>
                <th className="py-2.5 pr-3 font-medium text-right">Est. yearly</th>
                <th className="py-2.5 font-medium text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border-subtle/50 last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium text-foreground">{r.serviceName}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/70">{r.tier}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="neutral">{r.category}</Badge>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono-data font-semibold text-foreground">
                    {formatUsd(r.monthlyCost)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono-data text-muted-foreground">
                    {formatUsd(r.yearlyCost)}
                  </td>
                  <td className={`py-3 text-right font-mono-data font-medium ${confidenceTone(r.confidence)}`}>
                    {r.confidence}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default text-foreground">
                <td className="py-3 pr-3 font-semibold" colSpan={2}>
                  Total estimated cost
                </td>
                <td className="py-3 pr-3 text-right font-mono-data font-semibold">
                  {formatUsd(option.monthlyCost)}
                </td>
                <td className="py-3 pr-3 text-right font-mono-data font-semibold">
                  {formatUsd(option.yearlyCost)}
                </td>
                <td className={`py-3 text-right font-mono-data font-semibold ${confidenceTone(option.confidence)}`}>
                  {option.confidence}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
