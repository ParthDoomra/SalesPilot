/**
 * ServiceCardList — Renders each service component with detailed explanation of choices and confidence.
 */

"use client";

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { CloudServiceNode } from '@/types';
import { useCurrency } from '@/hooks/use-currency';

interface ServiceCardListProps {
  services: CloudServiceNode[];
  currencyCode?: string;
}

export function ServiceCardList({ services, currencyCode = 'USD' }: ServiceCardListProps) {
  const { formatRangeFromUsd } = useCurrency();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {services.map((srv) => {
        const isLowConfidence = srv.confidence < 70;

        return (
          <div
            key={srv.id}
            className={`flex flex-col justify-between rounded-xl border border-border-subtle bg-surface p-4 transition-all hover:border-signal/30 ${
              isLowConfidence ? 'border-l-4 border-l-amber' : ''
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground">
                    {srv.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {srv.category} · {srv.tier}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-medium ${
                    isLowConfidence
                      ? 'bg-amber-soft text-amber'
                      : srv.confidence >= 90
                        ? 'bg-success-soft text-success'
                        : 'bg-surface-raised text-muted-foreground'
                  }`}
                >
                  {srv.confidence}% confidence
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90">
                {srv.reason}
              </p>
            </div>

            {srv.estimatedMonthlyCostRange && (
              <div className="mt-4 border-t border-border-subtle/50 pt-2.5 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Est. Cost:</span>
                <span className="font-mono-data font-semibold text-foreground">
                  {formatRangeFromUsd(srv.estimatedMonthlyCostRange, currencyCode)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
