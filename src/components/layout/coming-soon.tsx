import { type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export function ComingSoon({
  title,
  description,
  icon: Icon,
  sections,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  sections: string[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-lg font-medium">This module is scaffolded, not wired up yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The layout and data structure are in place. Here&apos;s what will live on this page:
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {sections.map((s) => (
            <span key={s} className="rounded-full border border-border-default bg-surface px-3 py-1 text-xs text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
