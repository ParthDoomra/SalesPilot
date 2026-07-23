/**
 * OptionCompareCards — Displays the 3 generated cloud architecture options side-by-side.
 */

"use client";

import * as React from 'react';
import { Star, Award, Zap, Shield, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ArchitectureOption } from '@/types';
import { useCurrency } from '@/hooks/use-currency';

interface OptionCompareCardsProps {
  options: ArchitectureOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isUpdating: boolean;
  currencyCode?: string;
}

export function OptionCompareCards({ options, selectedId, onSelect, isUpdating, currencyCode = 'USD' }: OptionCompareCardsProps) {
  const { formatRangeFromUsd } = useCurrency();
  // Sort options so that balanced/recommended is first, then performance, then budget
  const sorted = [...options].sort((a, b) => {
    const order = { balanced: 0, performance: 1, budget: 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {sorted.map((opt) => {
        const isSelected = opt.id === selectedId;
        const Icon = opt.type === 'performance' ? Zap : opt.type === 'balanced' ? Award : Shield;

        return (
          <Card
            key={opt.id}
            onClick={() => !isUpdating && onSelect(opt.id)}
            className={`relative flex flex-col cursor-pointer transition-all duration-200 border-2 ${
              isSelected
                ? 'border-signal bg-signal-soft/10 shadow-lg scale-[1.01]'
                : 'border-border-subtle hover:border-border-default bg-surface/50'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-signal-soft p-1.5 text-signal">
                  <Icon className="h-4 w-4" />
                </span>
                <Badge variant={isSelected ? 'default' : 'neutral'}>
                  {opt.badgeText}
                </Badge>
              </div>

              <CardTitle className="mt-3 font-display text-base font-semibold">
                {opt.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-between">
              <div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {opt.description}
                </p>

                {/* Stars and Cost */}
                <div className="mt-4 flex items-center justify-between border-y border-border-subtle/50 py-2.5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < opt.starRating
                            ? 'fill-amber text-amber'
                            : 'text-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-data text-xs font-semibold text-foreground">
                    {formatRangeFromUsd(opt.costEstimateRange, currencyCode)}
                  </span>
                </div>

                <div className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
                  <strong>Rationale: </strong> {opt.recommendationReason}
                </div>
              </div>

              <div className="mt-5">
                <button
                  disabled={isUpdating}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-signal text-signal-foreground shadow-sm'
                      : 'bg-surface-raised border border-border-default text-foreground hover:bg-surface'
                  }`}
                >
                  {isSelected ? (
                    <><Check className="h-3.5 w-3.5" /> Selected</>
                  ) : (
                    'Select Architecture'
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
