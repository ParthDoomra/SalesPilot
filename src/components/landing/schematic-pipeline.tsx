"use client";

const STAGES = [
  { label: "Requirements", detail: "AI interview + validation", x: 60 },
  { label: "Architecture", detail: "Cloud-native design", x: 320 },
  { label: "Pricing", detail: "Live AWS / Azure / GCP rates", x: 580 },
  { label: "Proposal", detail: "Diagrams, BOM, docs", x: 840 },
];

export function SchematicPipeline() {
  return (
    <div className="rounded-xl border border-border-default bg-surface/60 p-4 shadow-sm backdrop-blur-sm md:p-8">
      <svg viewBox="0 0 900 220" className="w-full" role="img" aria-label="SalesPilot pipeline: requirements, architecture, pricing, proposal">
        <defs>
          <linearGradient id="trace-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-signal)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* base connecting line */}
        <line x1="60" y1="110" x2="840" y2="110" stroke="var(--color-border-default)" strokeWidth="2" />

        {/* animated traveling signal */}
        <rect x="0" y="106" width="120" height="8" rx="4" fill="url(#trace-grad)">
          <animate attributeName="x" from="-120" to="900" dur="3.2s" repeatCount="indefinite" />
        </rect>

        {STAGES.map((s, i) => (
          <g key={s.label}>
            <circle cx={s.x} cy={110} r="9" fill="var(--color-surface)" stroke="var(--color-signal)" strokeWidth="2.5" />
            <circle cx={s.x} cy={110} r="3" fill="var(--color-signal)" />
            <text
              x={s.x}
              y={70}
              textAnchor="middle"
              className="font-display"
              fontSize="15"
              fontWeight={600}
              fill="var(--color-foreground)"
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            <text x={s.x} y={150} textAnchor="middle" fontSize="14" fontWeight={600} fill="var(--color-foreground)">
              {s.label}
            </text>
            <text x={s.x} y={170} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)">
              {s.detail}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
