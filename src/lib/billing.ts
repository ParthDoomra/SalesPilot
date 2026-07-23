"use client";

/**
 * Billing model + payment-provider abstraction.
 *
 * This file is the single seam for payments. The UI depends only on the data
 * shapes and the `paymentProvider` interface below — swapping the mock provider
 * for Stripe (or any PSP) later requires NO UI changes: implement
 * `PaymentProvider` against Stripe Checkout/Billing Portal and export it as
 * `paymentProvider`.
 *
 * All figures here are mock/seed data (there is no real billing backend yet).
 * Live workspace usage (projects, proposals, architectures) is read separately
 * from the app's analytics data in the Billing page.
 */

export type PlanId = "free" | "starter" | "professional" | "business" | "enterprise";

/**
 * A subscription plan. This is the single, data-driven source of truth for the
 * pricing cards — the UI renders by mapping over `subscriptionPlans`. Ready for
 * Firebase/Stripe: `id` can map to a Stripe Price ID and the config can later be
 * fetched from Firestore instead of being defined here.
 */
export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  /** Monthly price in USD; null for a custom (Enterprise) quote. */
  monthlyPrice: number | null;
  /** Included monthly AI credits; null for custom/unlimited. */
  aiCredits: number | null;
  /** Included workspace seats; null for unlimited. */
  workspaceSeats: number | null;
  /** Short selling points shown on the card. */
  features: string[];
  /** Custom-quote plan (no fixed price/limits, "Contact sales"). */
  isEnterprise: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    aiCredits: 25_000,
    workspaceSeats: 1,
    features: ["1 workspace seat", "25K AI credits / mo", "Community support"],
    isEnterprise: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    aiCredits: 150_000,
    workspaceSeats: 3,
    features: ["3 workspace seats", "150K AI credits / mo", "Email support"],
    isEnterprise: false,
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 99,
    aiCredits: 1_000_000,
    workspaceSeats: 10,
    features: ["10 workspace seats", "1M AI credits / mo", "Priority support"],
    isEnterprise: false,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 249,
    aiCredits: 3_000_000,
    workspaceSeats: 25,
    features: ["25 workspace seats", "3M AI credits / mo", "SSO + audit log"],
    isEnterprise: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    aiCredits: null,
    workspaceSeats: null,
    features: ["Unlimited seats", "Custom AI credits", "Dedicated success manager"],
    isEnterprise: true,
  },
];

/** Human-readable price label for a plan, derived from its data. */
export function planPriceLabel(plan: SubscriptionPlan): string {
  return plan.isEnterprise || plan.monthlyPrice === null ? "Custom" : `$${plan.monthlyPrice}/mo`;
}

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_50k", credits: 50_000, priceUsd: 10 },
  { id: "pack_250k", credits: 250_000, priceUsd: 40 },
  { id: "pack_500k", credits: 500_000, priceUsd: 75 },
  { id: "pack_1m", credits: 1_000_000, priceUsd: 140 },
];

export interface CreditUsage {
  total: number;
  used: number;
  remaining: number;
  /** ISO date (YYYY-MM-DD) the monthly allowance resets. */
  resetDate: string;
}

export type InvoiceStatus = "Paid" | "Pending" | "Failed";

export interface Invoice {
  id: string;
  number: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  amountUsd: number;
  status: InvoiceStatus;
}

export interface Subscription {
  planId: PlanId;
  /** ISO date the plan next renews. */
  renewsOn: string;
}

export interface BillingSummary {
  subscription: Subscription;
  usage: CreditUsage;
  invoices: Invoice[];
}

function firstOfNextMonth(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the current billing summary. Mock today; replace the body with a call
 * to your billing backend (e.g. Stripe subscription + usage records) later —
 * the return shape is all the UI consumes.
 */
export function getBillingSummary(now: Date = new Date()): BillingSummary {
  // The active workspace plan. No real subscription backend yet, so this is a
  // temporary mock; later, read it from Firestore/Stripe subscription state.
  const plan = subscriptionPlans.find((p) => p.id === "professional")!;
  const total = plan.aiCredits ?? 0;
  const used = 342_180;
  return {
    subscription: {
      planId: plan.id,
      renewsOn: firstOfNextMonth(now),
    },
    usage: {
      total,
      used,
      remaining: Math.max(0, total - used),
      resetDate: firstOfNextMonth(now),
    },
    invoices: [
      { id: "inv_1", number: "SP-2026-0007", date: "2026-07-01", amountUsd: 99, status: "Paid" },
      { id: "inv_2", number: "SP-2026-0006", date: "2026-06-01", amountUsd: 99, status: "Paid" },
      { id: "inv_3", number: "SP-2026-0005", date: "2026-05-01", amountUsd: 99, status: "Paid" },
      { id: "inv_4", number: "SP-2026-0004", date: "2026-04-01", amountUsd: 40, status: "Paid" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Payment provider abstraction — the ONLY thing to reimplement for Stripe.
// ---------------------------------------------------------------------------

export interface PaymentResult {
  ok: boolean;
  message: string;
}

export interface PaymentProvider {
  purchaseCredits(packId: string): Promise<PaymentResult>;
  upgradePlan(planId: PlanId): Promise<PaymentResult>;
  manageSubscription(): Promise<PaymentResult>;
  updatePaymentMethod(): Promise<PaymentResult>;
  downloadInvoice(invoiceId: string): Promise<PaymentResult>;
}

/**
 * Mock provider — resolves after a short delay with a friendly message. Swap
 * this out for a Stripe-backed implementation (Checkout Session / Billing
 * Portal redirects) without touching any component.
 */
export const mockPaymentProvider: PaymentProvider = {
  async purchaseCredits(packId) {
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    await delay();
    if (!pack) return { ok: false, message: "Unknown credit pack." };
    return {
      ok: true,
      message: `Mock checkout: ${pack.credits.toLocaleString()} credits for $${pack.priceUsd}. Connect a payment provider to complete real purchases.`,
    };
  },
  async upgradePlan(planId) {
    const plan = subscriptionPlans.find((p) => p.id === planId);
    await delay();
    return {
      ok: true,
      message: plan
        ? `Mock upgrade to ${plan.name}. Payment integration required to apply this change.`
        : "Unknown plan.",
    };
  },
  async manageSubscription() {
    await delay();
    return { ok: true, message: "Mock: this would open the subscription management portal." };
  },
  async updatePaymentMethod() {
    await delay();
    return { ok: true, message: "Mock: this would open the secure payment-method form." };
  },
  async downloadInvoice(invoiceId) {
    await delay(200);
    return { ok: true, message: `Mock: preparing invoice ${invoiceId} for download.` };
  },
};

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The active provider. Point this at a Stripe implementation later. */
export const paymentProvider: PaymentProvider = mockPaymentProvider;
