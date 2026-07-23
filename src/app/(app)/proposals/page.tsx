"use client";

/**
 * Proposal Center — lists every generated proposal, grouped by project, with an
 * expandable per-project version history. Data is loaded from the persisted
 * project proposal store (see `project-proposal-store`); regenerating appends
 * the next version. All rendering reuses the existing design-system primitives
 * and the proposal export service.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileStack,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Download,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { useProjectsStore } from "@/lib/projects-store";
import { useProjectProposalStore, type ProposalVersion } from "@/lib/project-proposal-store";
import { generateProposalForProject } from "@/lib/proposal-generation";
import { openProposalPrintWindow } from "@/lib/proposal-export";
import type { ProposalStatus } from "@/lib/types";

const PROPOSAL_STATUS_VARIANT: Record<ProposalStatus, "default" | "success" | "warning" | "neutral"> = {
  "Not Started": "neutral",
  Draft: "neutral",
  "In Review": "warning",
  Sent: "default",
  Approved: "success",
};

function fmtDate(iso: string): string {
  // Stored as ISO; the date portion is all the list needs.
  return iso ? iso.slice(0, 10) : "—";
}

export default function ProposalsPage() {
  const router = useRouter();
  const projects = useProjectsStore((s) => s.projects);
  const byProject = useProjectProposalStore((s) => s.byProject);
  const addVersion = useProjectProposalStore((s) => s.addVersion);

  // Defer to after mount so the persisted store's client value doesn't clash
  // with the server-rendered (empty) markup.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = React.useState<Record<string, boolean>>({});
  const [errors, setErrors] = React.useState<Record<string, string | null>>({});

  const groups = React.useMemo(() => {
    const visible = projects.filter((p) => !p.archived);
    return visible
      .map((project) => {
        const versions = [...(byProject[project.id] ?? [])].sort((a, b) => b.version - a.version);
        return { project, versions, latestVersion: versions[0]?.version ?? 0 };
      })
      .sort((a, b) => {
        // Projects with proposals first, then most recently updated.
        if (!!a.versions.length !== !!b.versions.length) return a.versions.length ? -1 : 1;
        return a.project.updatedAt < b.project.updatedAt ? 1 : -1;
      });
  }, [projects, byProject]);

  const totalProposals = React.useMemo(
    () => Object.values(byProject).reduce((sum, list) => sum + list.length, 0),
    [byProject],
  );

  const toggle = (projectId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });

  const handleRegenerate = React.useCallback(
    async (projectId: string) => {
      setRegenerating((prev) => ({ ...prev, [projectId]: true }));
      setErrors((prev) => ({ ...prev, [projectId]: null }));
      try {
        const result = await generateProposalForProject(projectId);
        if (result.proposal) {
          addVersion(projectId, result.proposal);
          setExpanded((prev) => new Set(prev).add(projectId));
        } else if (result.reason === "no-architecture") {
          setErrors((prev) => ({
            ...prev,
            [projectId]: "Generate and select an architecture for this project first.",
          }));
        } else if (result.error) {
          setErrors((prev) => ({ ...prev, [projectId]: result.error }));
        }
      } finally {
        setRegenerating((prev) => ({ ...prev, [projectId]: false }));
      }
    },
    [addVersion],
  );

  return (
    <div>
      <PageHeader
        title="Proposal Center"
        description={
          ready
            ? `${totalProposals} proposal${totalProposals === 1 ? "" : "s"} across ${groups.length} project${groups.length === 1 ? "" : "s"}`
            : "Manage, preview, and export customer proposals."
        }
      />

      {!ready ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border-subtle bg-surface">
          <Loader2 className="h-6 w-6 animate-spin text-signal" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <FileStack className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-medium">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Create a project and generate its proposal to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ project, versions, latestVersion }) => {
            const isOpen = expanded.has(project.id);
            const isRegenerating = !!regenerating[project.id];
            const error = errors[project.id];

            return (
              <Card key={project.id} className="overflow-hidden p-0">
                {/* Project header */}
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => toggle(project.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span className="text-muted-foreground">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-base font-medium text-foreground">
                          {project.name}
                        </h3>
                        <ProjectStatusBadge status={project.archived ? "Archived" : project.status} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {project.customer} ·{" "}
                        {versions.length > 0
                          ? `${versions.length} version${versions.length === 1 ? "" : "s"}`
                          : "No proposals yet"}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRegenerate(project.id)}
                    disabled={isRegenerating}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-xs font-medium text-signal-foreground hover:opacity-90 shadow-sm disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {versions.length > 0 ? "Regenerate" : "Generate"}
                  </button>
                </div>

                {error && (
                  <div className="border-t border-border-subtle bg-danger-soft px-5 py-2.5 text-xs text-danger">
                    {error}
                  </div>
                )}

                {/* Version history */}
                {isOpen && (
                  <div className="border-t border-border-subtle">
                    {versions.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 p-10 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-muted-foreground">
                          <FileText className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No proposals generated yet</p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                          Use “Generate” to build the first proposal from this project&apos;s architecture,
                          requirement, and pricing report.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border-subtle">
                        {versions.map((v) => (
                          <VersionRow
                            key={v.id}
                            version={v}
                            isLatest={v.version === latestVersion}
                            onView={() => openProposalPrintWindow(v.proposal, false)}
                            onEdit={() => router.push(`/projects/${project.id}`)}
                            onDownload={() => openProposalPrintWindow(v.proposal, true)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VersionRow({
  version,
  isLatest,
  onView,
  onEdit,
  onDownload,
}: {
  version: ProposalVersion;
  isLatest: boolean;
  onView: () => void;
  onEdit: () => void;
  onDownload: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono-data text-sm font-semibold text-foreground">V{version.version}</span>
          {isLatest && <Badge variant="default">Latest</Badge>}
        </div>
        <Badge variant={PROPOSAL_STATUS_VARIANT[version.status]}>{version.status}</Badge>
        <span className="text-xs text-muted-foreground">Created {fmtDate(version.createdAt)}</span>
        <span className="text-xs text-muted-foreground">Updated {fmtDate(version.updatedAt)}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ActionButton icon={Eye} label="View" onClick={onView} />
        <ActionButton icon={Pencil} label="Edit" onClick={onEdit} />
        <ActionButton icon={Download} label="Download PDF" onClick={onDownload} />
      </div>
    </li>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-signal/50"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
