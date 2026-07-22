"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Does SalesPilot replace our cloud architects?",
    a: "No — it drafts a first-pass architecture and pricing so your architects start from something concrete instead of a blank page, and can focus their time on the decisions that need judgment.",
  },
  {
    q: "Which cloud providers does pricing cover?",
    a: "Azure, AWS, and Google Cloud, pulled from each provider's public pricing catalog so estimates reflect current rates rather than a cached price list.",
  },
  {
    q: "Can we bring our own proposal template?",
    a: "Yes. Business and Enterprise plans support custom proposal branding and layout, configured in Settings under Branding.",
  },
  {
    q: "Is there a limit on team members?",
    a: "Starter is capped at one seat. Professional supports up to 10, Business is unlimited, and Enterprise adds org-wide role and access controls.",
  },
  {
    q: "How is data handled for compliance-sensitive customers?",
    a: "Requirements support region and compliance fields per project, and Enterprise plans include audit logs and SSO for stricter access control.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-border-subtle py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
          {FAQS.map((item, i) => (
            <div key={item.q}>
              <button
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="font-display text-sm font-medium md:text-base">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-180")}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
