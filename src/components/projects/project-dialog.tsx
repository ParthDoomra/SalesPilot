"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjectsStore } from "@/lib/projects-store";
import type { Project } from "@/lib/types";

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}) {
  const { addProject, updateProject } = useProjectsStore();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setCustomer(project?.customer ?? "");
      setDescription(project?.description ?? "");
    }
  }, [open, project]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (project) {
      updateProject(project.id, { name, customer, description });
    } else {
      addProject({ name, customer, description });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the basic details for this project." : "Start a new solution for a customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name">Project name</Label>
            <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ERP Rollout — 500 Seats" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-customer">Customer</Label>
            <Input id="proj-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of the solution" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{project ? "Save changes" : "Create project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
