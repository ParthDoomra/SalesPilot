"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_PROJECTS } from "./mock-data";
import type { Project, ProjectStatus } from "./types";

interface ProjectsState {
  projects: Project[];
  addProject: (input: Pick<Project, "name" | "customer" | "description">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleArchive: (id: string) => void;
}

function newId() {
  return `proj_${Math.random().toString(36).slice(2, 9)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      addProject: (input) => {
        const project: Project = {
          id: newId(),
          name: input.name,
          customer: input.customer,
          description: input.description,
          status: "Discovery" as ProjectStatus,
          proposalStatus: "Not Started",
          monthlyEstimate: 0,
          createdAt: today(),
          updatedAt: today(),
          owner: "You",
          archived: false,
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },
      updateProject: (id, patch) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: today() } : p
          ),
        });
      },
      deleteProject: (id) => {
        set({ projects: get().projects.filter((p) => p.id !== id) });
      },
      toggleArchive: (id) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, archived: !p.archived, updatedAt: today() } : p
          ),
        });
      },
    }),
    { name: "salespilot_projects" }
  )
);
