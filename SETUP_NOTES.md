# SalesPilot — Phase 1 (Landing + Dashboard + Projects)

## What's in this build

- **Landing page** — hero (with an animated schematic pipeline diagram), features, workflow, pricing, testimonials, FAQ, footer, contact CTA
- **Auth flow (UI only, mock)** — login, register, forgot password. Session is stored in `localStorage`, not Firebase yet.
- **App shell** — responsive sidebar + topbar, global search (client-side, over mock projects), notifications dropdown, theme toggle, user menu
- **Dashboard** — stat cards, monthly cost trend chart, recent proposals, AI activity, recent conversations, team members, notifications
- **Projects module** — full CRUD (create, edit, delete, archive/unarchive), search, status filter, project detail page with the 8 spec'd tabs (Overview is live; the rest are labeled placeholders)
- Every other sidebar destination (AI Workspace, Proposals, Knowledge Base, Analytics, Billing, Settings, Admin, Profile) exists as a real route with a "scaffolded, not wired up yet" placeholder screen, so navigation never 404s.

## Design system

A "blueprint / schematic" visual identity, chosen to fit a product that literally designs cloud architecture diagrams: dark graphite base, a signal-blue accent for primary actions and data links, amber for cost-related figures. Space Grotesk for display type, Inter for body, JetBrains Mono for pricing/data. Both dark and light themes are implemented (toggle in the topbar); dark is the default.

## Running it locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. Any email/password works for login (mock auth) — it doesn't validate against a real backend yet.

## Known environment note

This sandbox had no network access to `fonts.googleapis.com`, so fonts are loaded via self-hosted `@fontsource` packages instead of `next/font/google`. This works identically and doesn't require a live Google Fonts connection — no action needed, just flagging the substitution in case you compare against a different reference setup.

## Not yet built (next phases)

- Firebase Auth + Firestore wiring (the mock auth in `src/lib/auth.tsx` and the projects store in `src/lib/projects-store.ts` are both intentionally shaped like their future Firebase equivalents so the swap is mostly a drop-in)
- AI Workspace chat interface, Proposal Center, Knowledge Base, Analytics charts, Billing, Settings, Admin Panel — currently placeholder screens
- Multi-tenant org switching UI, role-based permission enforcement beyond the Admin nav-item gate
- Requirements editor, Architecture viewer, Pricing dashboard (the project detail tabs for these are placeholders)

## Structure

```
src/
  app/
    (auth)/login, register, forgot-password    — public auth routes
    (app)/dashboard, projects, ...              — protected routes behind AppShell
  components/
    ui/          — primitives (button, card, dialog, dropdown, tabs, select, etc.)
    layout/      — sidebar, topbar, app shell, theme toggle, global search
    landing/     — marketing page sections
    dashboard/   — dashboard widgets
    projects/    — project card, create/edit dialog, status badge
  lib/
    auth.tsx           — mock auth context (swap for Firebase Auth later)
    projects-store.ts  — zustand store for projects (swap for Firestore later)
    mock-data.ts       — seed data
    types.ts           — shared domain types
```
