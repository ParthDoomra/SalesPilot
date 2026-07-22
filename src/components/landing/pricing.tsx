import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    description: "Try SalesPilot on a single active project.",
    features: ["1 active project", "AI requirements interview", "1 team member", "Community support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/user/mo",
    description: "For solution teams running several deals at once.",
    features: ["Unlimited projects", "Live pricing engine", "Up to 10 team members", "Proposal export", "Priority support"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Business",
    price: "$149",
    period: "/user/mo",
    description: "Multi-team orgs that need roles and approvals.",
    features: ["Everything in Professional", "Roles & permissions", "Approval workflows", "Analytics dashboard", "SSO"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Custom limits, security review, and dedicated support.",
    features: ["Everything in Business", "Custom integrations", "Dedicated success manager", "Audit logs", "SLA"],
    cta: "Contact sales",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border-subtle py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Straightforward pricing, per seat
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every plan includes the same core pipeline. Higher tiers add scale, governance, and support.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-xl border p-6",
                plan.highlight
                  ? "border-signal bg-signal-soft/40 shadow-md relative"
                  : "border-border-subtle bg-surface"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-signal px-2.5 py-0.5 text-xs font-medium text-signal-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-medium">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <Button className="mt-6" variant={plan.highlight ? "default" : "secondary"} asChild>
                <Link href={plan.name === "Enterprise" ? "#contact" : "/register"}>{plan.cta}</Link>
              </Button>
              <ul className="mt-6 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
