"use client";

import Link from "next/link";
import { MoreVertical, Building2, Calendar, Archive, ArchiveRestore, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import type { Project } from "@/lib/types";
import { useProjectsStore } from "@/lib/projects-store";
import { useProjectPricingStore } from "@/lib/project-pricing-store";
import { resolveProjectCurrency } from "@/lib/project-currency";
import { useCurrency } from "@/hooks/use-currency";

export function ProjectCard({ project, onEdit }: { project: Project; onEdit: (p: Project) => void }) {
  const { toggleArchive, deleteProject } = useProjectsStore();
  const pricingEstimate = useProjectPricingStore((s) => s.byProject[project.id] ?? null);
  const { code: currencyCode, monthlyEstimateUsd } = resolveProjectCurrency(project, { pricingEstimate });
  const { formatFromUsd } = useCurrency();

  return (
    <Card className="flex flex-col p-5 transition-colors hover:border-signal/40">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/projects/${project.id}`} className="min-w-0">
          <h3 className="truncate font-display text-base font-medium hover:text-signal">{project.name}</h3>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground" aria-label="Project actions">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleArchive(project.id)}>
              {project.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {project.archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteProject(project.id)}
              className="text-danger focus:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {project.customer}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={project.archived ? "Archived" : project.status} />
        <Badge variant="neutral">Proposal: {project.proposalStatus}</Badge>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Updated {project.updatedAt}
        </span>
        <span className="font-mono-data font-medium text-foreground">
          {monthlyEstimateUsd > 0 ? `${formatFromUsd(monthlyEstimateUsd, currencyCode)}/mo` : "—"}
        </span>
      </div>
    </Card>
  );
}
