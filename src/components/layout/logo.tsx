export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="12" r="2.5" className="fill-signal" />
        <circle cx="19" cy="5" r="2" className="fill-amber" />
        <circle cx="19" cy="19" r="2" className="fill-success" />
        <path d="M7.2 11 16.8 5.8M7.2 13 16.8 18.2" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">SalesPilot</span>
      )}
    </span>
  );
}
