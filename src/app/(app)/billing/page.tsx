"use client";

/**
 * Billing — subscription, AI credit usage, credit packs, workspace usage, and
 * billing history. All payment actions route through the `paymentProvider`
 * abstraction in `@/lib/billing`, so a real PSP (Stripe, …) can be wired in
 * later without changing this UI. Workspace usage numbers are live where the
 * app has the data (projects/proposals/architectures) and mock otherwise.
 */

import * as React from "react";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FolderKanban,
  Users,
  HardDrive,
  FileText,
  Network,
  Download,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import {
  subscriptionPlans,
  planPriceLabel,
  CREDIT_PACKS,
  getBillingSummary,
  paymentProvider,
  type BillingSummary,
  type PaymentResult,
} from "@/lib/billing";

// Workspace usage without a live source yet — clearly mock.
const MOCK_TEAM_MEMBERS = 6;
const MOCK_STORAGE_USED = "2.4 GB";

const INVOICE_STATUS_VARIANT = {
  Paid: "success",
  Pending: "warning",
  Failed: "danger",
} as const;

type Feedback = { ok: boolean; text: string } | null;

export default function BillingPage() {
  const analytics = useAnalyticsData();
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback>(null);

  // Compute the (Date-dependent) mock summary after mount to avoid SSR mismatch.
  React.useEffect(() => setSummary(getBillingSummary()), []);

  const ready = analytics.ready && summary !== null;

  async function run(key: string, action: () => Promise<PaymentResult>) {
    setBusy(key);
    setFeedback(null);
    try {
      const result = await action();
      setFeedback({ ok: result.ok, text: result.message });
    } finally {
      setBusy(null);
    }
  }

  if (!ready || !summary) {
    return (
      <div>
        <PageHeader title="Billing" description="Manage your subscription, AI credits, and usage." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse p-5" />
          ))}
        </div>
      </div>
    );
  }

  const { subscription, usage, invoices } = summary;
  const usedPct = usage.total > 0 ? Math.min(100, Math.round((usage.used / usage.total) * 100)) : 0;

  const workspaceUsage = [
    { icon: FolderKanban, label: "Active projects", value: String(analytics.activeProjects) },
    { icon: Users, label: "Team members", value: String(MOCK_TEAM_MEMBERS) },
    { icon: HardDrive, label: "Storage used", value: MOCK_STORAGE_USED },
    { icon: FileText, label: "Proposals generated", value: String(analytics.proposalsGenerated) },
    { icon: Network, label: "Architecture reports", value: String(analytics.architecturesGenerated) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, AI credits, and usage."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => run("upgrade", () => paymentProvider.upgradePlan("business"))} disabled={busy === "upgrade"}>
              {busy === "upgrade" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Upgrade Plan
            </Button>
            <Button variant="secondary" onClick={() => run("manage", () => paymentProvider.manageSubscription())} disabled={busy === "manage"}>
              {busy === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Manage Subscription
            </Button>
            <Button variant="outline" onClick={() => run("payment", () => paymentProvider.updatePaymentMethod())} disabled={busy === "payment"}>
              {busy === "payment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Update Payment Method
            </Button>
          </div>
        }
      />

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${
            feedback.ok ? "border-signal/20 bg-signal-soft text-signal" : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {feedback.text}
        </div>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription plan</CardTitle>
          <CardDescription>Your current plan is highlighted. Upgrade or downgrade anytime.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {subscriptionPlans.map((plan) => {
              const isCurrent = plan.id === subscription.planId;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl border p-4 ${
                    isCurrent ? "border-signal bg-signal-soft/10 shadow-sm" : "border-border-subtle bg-surface/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-foreground">{plan.name}</span>
                    {isCurrent && <Badge variant="default">Current</Badge>}
                  </div>
                  <div className="mt-2 font-display text-xl font-semibold text-foreground">{planPriceLabel(plan)}</div>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "secondary" : "outline"}
                    size="sm"
                    className="mt-4"
                    disabled={isCurrent || busy === `plan_${plan.id}`}
                    onClick={() => run(`plan_${plan.id}`, () => paymentProvider.upgradePlan(plan.id))}
                  >
                    {busy === `plan_${plan.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      "Current plan"
                    ) : plan.isEnterprise ? (
                      "Contact sales"
                    ) : (
                      "Choose plan"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI credit usage + Buy more credits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-signal" /> AI credit usage
            </CardTitle>
            <CardDescription>Resets on {usage.resetDate}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Total credits" value={usage.total.toLocaleString()} />
              <Metric label="Used" value={usage.used.toLocaleString()} />
              <Metric label="Remaining" value={usage.remaining.toLocaleString()} tone="text-success" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{usedPct}% used</span>
                <span>Resets {usage.resetDate}</span>
              </div>
              <Progress value={usedPct} indicatorClassName={usedPct >= 90 ? "bg-danger" : "bg-signal"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-signal" /> Buy more credits
            </CardTitle>
            <CardDescription>One-time top-ups, added to your remaining balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle p-3"
                >
                  <div>
                    <div className="font-mono-data text-sm font-semibold text-foreground">
                      {pack.credits.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">credits · ${pack.priceUsd}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === pack.id}
                    onClick={() => run(pack.id, () => paymentProvider.purchaseCredits(pack.id))}
                  >
                    {busy === pack.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buy"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace usage */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace usage</CardTitle>
          <CardDescription>Current utilization across your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {workspaceUsage.map((u) => (
              <div key={u.label} className="rounded-lg border border-border-subtle p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <u.icon className="h-3.5 w-3.5" /> {u.label}
                </div>
                <div className="mt-2 font-display text-xl font-semibold text-foreground">{u.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing history */}
      <Card>
        <CardHeader>
          <CardTitle>Billing history</CardTitle>
          <CardDescription>Invoices for your subscription and credit purchases</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {invoices.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-[11px] uppercase tracking-wider text-muted-foreground/60">
                    <th className="py-2.5 pr-3 font-medium">Invoice</th>
                    <th className="py-2.5 pr-3 font-medium">Date</th>
                    <th className="py-2.5 pr-3 font-medium">Amount</th>
                    <th className="py-2.5 pr-3 font-medium">Status</th>
                    <th className="py-2.5 font-medium text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border-subtle/50 last:border-0">
                      <td className="py-3 pr-3 font-mono-data font-medium text-foreground">{inv.number}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{inv.date}</td>
                      <td className="py-3 pr-3 font-mono-data text-foreground">${inv.amountUsd}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={INVOICE_STATUS_VARIANT[inv.status]}>{inv.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === `inv_${inv.id}`}
                          onClick={() => run(`inv_${inv.id}`, () => paymentProvider.downloadInvoice(inv.id))}
                        >
                          {busy === `inv_${inv.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
