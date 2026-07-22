const STEPS = [
  {
    n: "01",
    title: "Start a new solution",
    description: "Create a project and drop in whatever you already have — call notes, an RFP, a napkin sketch.",
  },
  {
    n: "02",
    title: "AI interviews the customer",
    description: "The requirement agent asks follow-up questions until business, technical, and compliance gaps are closed.",
  },
  {
    n: "03",
    title: "Architecture is drafted",
    description: "Requirements convert into a structured architecture: compute, storage, networking, and security laid out.",
  },
  {
    n: "04",
    title: "Live pricing is applied",
    description: "The pricing engine checks current Azure, AWS, and GCP rates and surfaces cheaper equivalent options.",
  },
  {
    n: "05",
    title: "Proposal is generated",
    description: "Diagrams, bill of materials, and pricing roll into an exportable proposal, versioned as it's revised.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-b border-border-subtle bg-surface/40 py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            One workflow, start to finish
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every stage hands off structured data to the next — nothing gets re-typed or re-explained.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border-default md:left-1/2" />
          <div className="flex flex-col gap-10">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`relative flex gap-6 md:gap-0 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-signal bg-surface font-mono-data text-sm font-medium text-signal md:absolute md:left-1/2 md:-translate-x-1/2">
                  {step.n}
                </div>
                <div className={`flex-1 pt-1 md:w-1/2 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
                  <h3 className="font-display text-lg font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
