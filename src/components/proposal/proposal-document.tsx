/**
 * ProposalDocument — the on-screen, presentation-ready proposal.
 *
 * Purely presentational: it renders a ProposalModel using the existing design
 * system (Card, Badge, typography) and reuses the Phase 3/4 components
 * (architecture diagram, budget summary, category breakdown, cost explanation)
 * so nothing is re-styled or duplicated.
 */

"use client";

import * as React from 'react';
import { CheckCircle2, Circle, Building2, Target, Factory, Cloud, Layers, Coins, ArrowLeftRight, CalendarDays, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArchitectureCanvas } from '@/components/architecture/architecture-canvas';
import { BudgetSummary } from '@/components/pricing/budget-summary';
import { CategoryBreakdown } from '@/components/pricing/category-breakdown';
import { CostExplanation } from '@/components/pricing/cost-explanation';
import type { ProposalModel } from '@/types';

interface ProposalDocumentProps {
  proposal: ProposalModel;
}

function SectionHeading({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-[11px] font-semibold text-signal-foreground">
        {index}
      </span>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export function ProposalDocument({ proposal }: ProposalDocumentProps) {
  const { executiveSummary: ex, selectedOption } = proposal;

  // Display all pricing in the customer's original currency; USD stays the
  // internal calculation currency. Source of truth is the pricing conversion.
  const conversion = proposal.estimate?.currencyConversion ?? null;
  const displayCurrency =
    conversion?.originalCurrency ?? selectedOption.budgetAnalysis.customerCurrency ?? proposal.currency;

  return (
    <div className="space-y-8">
      {/* 1. Executive Summary */}
      <section className="space-y-3">
        <SectionHeading index={1} title="Executive Summary" />
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryItem icon={Building2} label="Customer" value={ex.customerName} />
            <SummaryItem icon={Target} label="Business goal" value={ex.businessGoal} />
            <SummaryItem icon={Factory} label="Industry" value={ex.industry} />
            <SummaryItem icon={Cloud} label="Recommended cloud provider" value={ex.cloudProvider} />
            <SummaryItem icon={Layers} label="Recommended architecture" value={ex.architectureName} />
          </div>
        </Card>
      </section>

      {/* 2. Customer Requirements */}
      <section className="space-y-3">
        <SectionHeading index={2} title="Customer Requirements" />
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {proposal.requirements.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 border-b border-border-subtle/40 pb-2 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-right font-medium text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 3. Recommended Architecture */}
      <section className="space-y-3">
        <SectionHeading index={3} title="Recommended Architecture" />
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{proposal.architecture.name}</Badge>
            <Badge variant="neutral">Type: {proposal.architecture.type}</Badge>
            <Badge variant="neutral">{proposal.architecture.provider}</Badge>
            <Badge variant="neutral">Availability: {proposal.architecture.availability}</Badge>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Solution flow
            </h4>
            <ArchitectureCanvas
              nodes={proposal.architecture.visualFlowNodes}
              provider={proposal.architecture.provider}
            />
          </div>
        </Card>
      </section>

      {/* 4. Services Included */}
      <section className="space-y-3">
        <SectionHeading index={4} title="Services Included" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {proposal.services.map((s, i) => (
            <div key={`${s.name}-${i}`} className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-signal">{s.category}</span>
                <span className="text-[10px] text-muted-foreground/70">{s.provider} · {s.tier}</span>
              </div>
              <h4 className="mt-1.5 font-display text-sm font-semibold text-foreground">{s.name}</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">
                <strong className="text-foreground/80">Why:</strong> {s.why}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">
                <strong className="text-foreground/80">Role:</strong> {s.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Pricing Summary */}
      <section className="space-y-3">
        <SectionHeading index={5} title="Pricing Summary" />
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryItem icon={Coins} label="Original currency" value={displayCurrency} />
            <SummaryItem
              icon={ArrowLeftRight}
              label="Exchange rate"
              value={conversion ? `1 USD = ${conversion.exchangeRate} ${conversion.originalCurrency}` : '—'}
            />
            <SummaryItem
              icon={CalendarDays}
              label="Exchange rate date"
              value={conversion?.exchangeRateDate ?? '—'}
            />
            <SummaryItem icon={Calculator} label="Internal calculation currency" value="USD" />
          </div>
        </Card>
        <BudgetSummary analysis={selectedOption.budgetAnalysis} currency={displayCurrency} />
        <CategoryBreakdown categories={selectedOption.categories} currency={displayCurrency} />
        <CostExplanation option={selectedOption} currency={displayCurrency} />
      </section>

      {/* 6. Why This Architecture */}
      <section className="space-y-3">
        <SectionHeading index={6} title="Why This Architecture" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ['Scalability', proposal.why.scalability],
              ['Security', proposal.why.security],
              ['High Availability', proposal.why.highAvailability],
              ['Disaster Recovery', proposal.why.disasterRecovery],
              ['Performance', proposal.why.performance],
              ['Cost Optimization', proposal.why.costOptimization],
            ] as const
          ).map(([title, body]) => (
            <Card key={title} className="p-4">
              <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 7. Benefits */}
      <section className="space-y-3">
        <SectionHeading index={7} title="Benefits" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {proposal.benefits.map((b) => (
            <div key={b} className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="text-sm font-medium text-foreground">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Assumptions */}
      <section className="space-y-3">
        <SectionHeading index={8} title="Assumptions" />
        <Card className="p-5">
          <ul className="space-y-2.5">
            {proposal.assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[9px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* 9. Next Steps */}
      <section className="space-y-3">
        <SectionHeading index={9} title="Next Steps" />
        <Card className="p-5">
          <ol className="space-y-3">
            {proposal.nextSteps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-signal" />
                )}
                <span className={step.done ? 'text-foreground' : 'font-medium text-foreground'}>{step.label}</span>
                {!step.done && <Badge variant="default">Current</Badge>}
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
