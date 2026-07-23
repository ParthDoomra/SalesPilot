"use client";

/**
 * ProjectSettings — the project's Settings tab.
 *
 * Loads the project's current details from the persisted projects store and
 * saves edits back to it. Includes a Danger Zone for archiving and deleting the
 * project. Reuses the existing design-system primitives (Card, Input, Textarea,
 * Label, Select, Button, Dialog).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Archive, ArchiveRestore, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProjectsStore } from "@/lib/projects-store";
import { SUPPORTED_CURRENCIES } from "@/services/currency/constants";
import type { Project } from "@/lib/types";

const PROVIDERS = ["AWS", "Azure", "GCP"] as const;
const REGIONS = [
  "United States",
  "United Kingdom",
  "Europe",
  "India",
  "Asia Pacific",
  "Middle East",
  "Latin America",
] as const;

type Feedback = { type: "success" | "error"; text: string } | null;

export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const updateProject = useProjectsStore((s) => s.updateProject);
  const toggleArchive = useProjectsStore((s) => s.toggleArchive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  const [name, setName] = React.useState(project.name);
  const [customer, setCustomer] = React.useState(project.customer);
  const [owner, setOwner] = React.useState(project.owner);
  const [description, setDescription] = React.useState(project.description);
  const [provider, setProvider] = React.useState(project.defaultProvider ?? "AWS");
  const [region, setRegion] = React.useState(project.defaultRegion ?? "United States");
  const [currency, setCurrency] = React.useState(
    project.defaultCurrency ?? project.estimateCurrency ?? "USD",
  );

  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Keep the form in sync if the project changes underneath us.
  React.useEffect(() => {
    setName(project.name);
    setCustomer(project.customer);
    setOwner(project.owner);
    setDescription(project.description);
    setProvider(project.defaultProvider ?? "AWS");
    setRegion(project.defaultRegion ?? "United States");
    setCurrency(project.defaultCurrency ?? project.estimateCurrency ?? "USD");
  }, [project]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !customer.trim()) {
      setFeedback({ type: "error", text: "Project name and customer name are required." });
      return;
    }
    try {
      updateProject(project.id, {
        name: name.trim(),
        customer: customer.trim(),
        owner: owner.trim(),
        description: description.trim(),
        defaultProvider: provider,
        defaultRegion: region,
        defaultCurrency: currency,
      });
      setFeedback({ type: "success", text: "Project settings saved." });
    } catch {
      setFeedback({ type: "error", text: "Could not save the project settings. Please try again." });
    }
  }

  function handleDelete() {
    setConfirmOpen(false);
    deleteProject(project.id);
    router.push("/projects");
  }

  return (
    <div className="flex flex-col gap-6">
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${
            feedback.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {feedback.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>Update the core information and defaults for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="set-name">Project name</Label>
                <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="set-customer">Customer name</Label>
                <Input id="set-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="set-owner">Project owner</Label>
                <Input id="set-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Default cloud provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Default region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Default currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="set-desc">Description</Label>
              <Textarea
                id="set-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions for this project.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">
                {project.archived ? "Unarchive project" : "Archive project"}
              </div>
              <div className="text-xs text-muted-foreground">
                {project.archived
                  ? "Restore this project to the active list."
                  : "Hide this project from the active list without deleting it."}
              </div>
            </div>
            <Button variant="secondary" onClick={() => toggleArchive(project.id)} className="shrink-0">
              {project.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {project.archived ? "Unarchive" : "Archive"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-danger/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Delete project</div>
              <div className="text-xs text-muted-foreground">
                Permanently delete this project and its saved data. This cannot be undone.
              </div>
            </div>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)} className="shrink-0">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              “{project.name}” and its saved data will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
