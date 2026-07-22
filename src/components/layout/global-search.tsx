"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, Building2 } from "lucide-react";
import { SEED_PROJECTS } from "@/lib/mock-data";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SEED_PROJECTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search projects, customers, proposals..."
        className="h-9 w-full rounded-md border border-border-default bg-surface-raised pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-signal"
      />

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-md border border-border-default bg-surface shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for “{query}”</div>
          ) : (
            <ul className="py-1">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-raised"
                    onClick={() => {
                      router.push(`/projects/${p.id}`);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-signal" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {p.customer}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
