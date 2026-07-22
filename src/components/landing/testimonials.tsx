const QUOTES = [
  {
    quote:
      "We used to spend two days pricing an ERP deal before we could even talk numbers with the customer. Now it's ready before the call ends.",
    name: "Dana Whitfield",
    role: "Principal Solutions Architect, placeholder logo co.",
  },
  {
    quote:
      "The requirement interview catches the compliance questions our juniors used to forget to ask. Fewer surprises in scoping calls.",
    name: "Marcus Ilić",
    role: "VP Pre-Sales, placeholder logo co.",
  },
  {
    quote:
      "Proposal exports look like something our design team made, not a spreadsheet screenshot. Customers notice.",
    name: "Renata Oduya",
    role: "Sales Engineering Lead, placeholder logo co.",
  },
];

export function Testimonials() {
  return (
    <section className="border-b border-border-subtle bg-surface/40 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Trusted by solution teams
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">Sample quotes — replace with real customer testimonials.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {QUOTES.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-xl border border-border-subtle bg-surface p-6">
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-soft text-xs font-medium text-signal">
                  {t.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
