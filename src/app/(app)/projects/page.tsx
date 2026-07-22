"use client";

import * as React from "react";
import { Plus, Search, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { useProjectsStore } from "@/lib/projects-store";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUS_FILTERS: (ProjectStatus | "All")[] = [
  "All",
  "Discovery",
  "In Progress",
  "Proposal Sent",
  "Won",
  "Lost",
];

export default function ProjectsPage() {
  const { projects } = useProjectsStore();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | "All">("All");
  const [showArchived, setShowArchived] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);

  const filtered = projects.filter((p) => {
    if (p.archived !== showArchived) return false;
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.customer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function openCreate() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.filter((p) => !p.archived).length} active projects`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create project
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project or customer..."
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "All")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "All" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showArchived ? "default" : "secondary"}
          onClick={() => setShowArchived((v) => !v)}
          className="shrink-0"
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-soft text-signal">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-medium">
            {showArchived ? "No archived projects" : "No projects match your filters"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {showArchived
              ? "Projects you archive will show up here."
              : "Try a different search, or create a new project to get started."}
          </p>
          {!showArchived && (
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onEdit={openEdit} />
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} />
    </div>
  );
}
