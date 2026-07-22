import { Boxes, MessagesSquare, Gauge, FileStack, ShieldCheck, Users } from "lucide-react";

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Conversational requirements",
    description: "An AI interview captures business, infrastructure, budget, and compliance needs, and flags what's missing.",
  },
  {
    icon: Boxes,
    title: "Architecture generation",
    description: "Turn structured requirements into a cloud-native architecture with compute, storage, and networking mapped out.",
  },
  {
    icon: Gauge,
    title: "Live cost estimation",
    description: "Pricing pulled against real Azure, AWS, and GCP catalogs, broken down by service so nothing is a surprise later.",
  },
  {
    icon: FileStack,
    title: "Proposal-ready docs",
    description: "Export diagrams, a bill of materials, and pricing into a proposal your customer can actually sign.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "Organizations, roles, and shared project workspaces so sales engineers and architects stay in sync.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance-aware",
    description: "Availability, security, and regional requirements are tracked alongside cost from the very first draft.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border-subtle py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Everything between the first call and the signed proposal
          </h2>
          <p className="mt-4 text-muted-foreground">
            SalesPilot replaces the spreadsheet-and-slideware grind with one workspace built around how solution teams actually work.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group bg-surface p-7 transition-colors hover:bg-surface-raised">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-signal-soft text-signal">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
