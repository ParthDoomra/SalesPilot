"use client";

/**
 * ProjectActivity — the project's Activity tab timeline.
 *
 * Builds a unified, newest-first timeline by:
 *   • DERIVING events from the persisted project data (project created,
 *     architecture generated/regenerated, pricing generated, proposal
 *     generated/edited), and
 *   • MERGING the recorded events from the activity store (requirements
 *     uploaded, AI analysis, proposal downloaded, status changes).
 *
 * Reuses the existing design-system Card + the dashboard timeline visual style.
 */

import * as React from "react";
import {
  FolderPlus,
  Upload,
  Sparkles,
  Network,
  RefreshCw,
  Calculator,
  FileText,
  Pencil,
  Download,
  Flag,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectsStore } from "@/lib/projects-store";
import { useProjectArchitectureStore } from "@/lib/project-architecture-store";
import { useProjectPricingStore } from "@/lib/project-pricing-store";
import { useProjectProposalStore } from "@/lib/project-proposal-store";
import { useActivityStore, type ActivityType, type ActivitySource } from "@/lib/activity-store";

interface TimelineEntry {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  source: ActivitySource;
  timestamp: string;
}

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  project_created: FolderPlus,
  requirements_uploaded: Upload,
  requirement_analysis: Sparkles,
  architecture_generated: Network,
  architecture_regenerated: RefreshCw,
  pricing_generated: Calculator,
  proposal_generated: FileText,
  proposal_edited: Pencil,
  proposal_downloaded: Download,
  status_changed: Flag,
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  // Date-only inputs (project.createdAt) have no time component.
  if (!iso.includes("T")) return date;
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function ProjectActivity({ projectId }: { projectId: string }) {
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId) ?? null);
  const architecture = useProjectArchitectureStore((s) => s.byProject[projectId] ?? null);
  const pricing = useProjectPricingStore((s) => s.byProject[projectId] ?? null);
  const proposals = useProjectProposalStore((s) => s.byProject[projectId] ?? null);
  const logged = useActivityStore((s) => s.byProject[projectId] ?? null);

  // Defer store-derived content to after mount to avoid any SSR/CSR mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const entries = React.useMemo<TimelineEntry[]>(() => {
    if (!mounted) return [];
    const list: TimelineEntry[] = [];

    // Derived — project created.
    if (project) {
      list.push({
        id: `derived_created_${project.id}`,
        type: "project_created",
        title: "Project created",
        detail: project.customer ? `Customer: ${project.customer}` : undefined,
        source: "user",
        timestamp: project.createdAt,
      });
    }

    // Derived — architecture generated / regenerated.
    if (architecture) {
      list.push({
        id: `derived_arch_gen_${architecture.id}`,
        type: "architecture_generated",
        title: "Architecture generated",
        detail: architecture.selectedProvider ? `${architecture.selectedProvider}` : undefined,
        source: "ai",
        timestamp: architecture.createdAt,
      });
      if (architecture.version > 1) {
        list.push({
          id: `derived_arch_regen_${architecture.id}_${architecture.version}`,
          type: "architecture_regenerated",
          title: `Architecture regenerated (v${architecture.version})`,
          detail: architecture.selectedProvider ? `${architecture.selectedProvider}` : undefined,
          source: "ai",
          timestamp: architecture.updatedAt,
        });
      }
    }

    // Derived — pricing generated.
    if (pricing) {
      list.push({
        id: `derived_pricing_${pricing.id}`,
        type: "pricing_generated",
        title: "Pricing generated",
        detail: `${pricing.provider} · estimated in USD`,
        source: "ai",
        timestamp: pricing.generatedAt,
      });
    }

    // Derived — proposal generated / edited (per version).
    for (const v of proposals ?? []) {
      list.push({
        id: `derived_prop_gen_${v.id}`,
        type: "proposal_generated",
        title: `Proposal generated (v${v.version})`,
        source: "ai",
        timestamp: v.createdAt,
      });
      if (v.updatedAt && v.updatedAt !== v.createdAt) {
        list.push({
          id: `derived_prop_edit_${v.id}`,
          type: "proposal_edited",
          title: `Proposal edited (v${v.version})`,
          detail: `Status: ${v.status}`,
          source: "user",
          timestamp: v.updatedAt,
        });
      }
    }

    // Recorded — requirements uploaded, AI analysis, downloads, status changes.
    for (const e of logged ?? []) {
      list.push({
        id: e.id,
        type: e.type,
        title: e.title,
        detail: e.detail,
        source: e.source,
        timestamp: e.timestamp,
      });
    }

    // Newest first.
    return list.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
  }, [mounted, project, architecture, pricing, proposals, logged]);

  if (mounted && entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <ActivityIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-base font-medium">No activity yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Activity will appear here as you upload requirements, generate the architecture and pricing,
            and produce proposals for this project.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="relative space-y-5 border-l border-border-subtle pl-5">
          {entries.map((e) => {
            const Icon = TYPE_ICON[e.type] ?? ActivityIcon;
            return (
              <div key={e.id} className="relative">
                <span className="absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface text-muted-foreground ring-4 ring-background">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/70">{formatTimestamp(e.timestamp)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      e.source === "ai" ? "bg-signal-soft text-signal" : "bg-surface-raised text-muted-foreground"
                    }`}
                  >
                    {e.source === "ai" ? "AI" : "You"}
                  </span>
                  {e.detail && <span>{e.detail}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
