"use client";

import * as React from "react";
import { UserPlus, Mail, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["Owner", "Admin", "Sales Engineer", "Viewer"];

const ROLE_PERMISSIONS: Record<Role, string> = {
  Owner: "Full access — billing, workspace settings, and team management.",
  Admin: "Manage projects, team members, and integrations (no billing).",
  "Sales Engineer": "Create and edit projects, architectures, pricing, and proposals.",
  Viewer: "Read-only access to projects and proposals.",
};

const ROLE_VARIANT: Record<Role, "default" | "success" | "warning" | "neutral"> = {
  Owner: "success",
  Admin: "default",
  "Sales Engineer": "warning",
  Viewer: "neutral",
};

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  pending?: boolean;
}

export function TeamSettings() {
  const { user } = useAuth();

  // Seeded with the current user + mock teammates (no team backend yet).
  const [members, setMembers] = React.useState<Member[]>(() => [
    {
      id: user?.id ?? "me",
      name: user?.name ?? "You",
      email: user?.email ?? "you@company.com",
      role: (user?.role as Role) ?? "Owner",
    },
    { id: "m2", name: "Priya Nathan", email: "priya@northbeam.io", role: "Sales Engineer" },
    { id: "m3", name: "Marcus Lee", email: "marcus@northbeam.io", role: "Admin" },
  ]);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("Sales Engineer");

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setMembers((prev) => [...prev, { id: `inv_${Date.now()}`, name, email, role: inviteRole, pending: true }]);
    setInviteEmail("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite members</CardTitle>
          <CardDescription>Send an invite and assign a role. Invites appear as pending below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-48">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit"><UserPlus className="h-4 w-4" /> Invite</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} member{members.length === 1 ? "" : "s"} in this workspace</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {members.map((m) => (
            <div key={m.id} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-signal-soft text-signal text-xs">
                    {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
                    {m.pending && <Badge variant="warning"><Mail className="h-3 w-3" /> Pending</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
              </div>
              <Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-signal" /> Roles &amp; permissions
          </CardTitle>
          <CardDescription>What each role can do in the workspace</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role} className="rounded-lg border border-border-subtle p-4">
              <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
              <p className="mt-2 text-xs text-muted-foreground">{ROLE_PERMISSIONS[role]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
