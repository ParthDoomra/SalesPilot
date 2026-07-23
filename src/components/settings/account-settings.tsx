"use client";

import { ShieldCheck, KeyRound, Smartphone, Link2, UserCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

/**
 * Account settings — the mount point for Clerk's <UserProfile />.
 *
 * Per the design, the account/profile UI is NOT custom-built: it is delegated
 * entirely to Clerk. Clerk is not yet wired into this app (mock auth today), so
 * this renders a build-safe placeholder that documents exactly where Clerk
 * mounts. Once `@clerk/nextjs` + a publishable key are configured, replace the
 * fallback block with:
 *
 *   import { UserProfile } from "@clerk/nextjs";
 *   ...
 *   <UserProfile routing="hash" appearance={{ ... }} />
 *
 * No surrounding layout changes are required — Clerk manages profile picture,
 * name, email, password, 2FA, active sessions, and connected accounts.
 */

const CLERK_MANAGED = [
  { icon: UserCircle, label: "Profile picture & name" },
  { icon: KeyRound, label: "Email & password" },
  { icon: Smartphone, label: "Two-factor authentication" },
  { icon: ShieldCheck, label: "Active sessions" },
  { icon: Link2, label: "Connected accounts" },
];

export function AccountSettings() {
  const { user } = useAuth();
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Your profile and security are managed by Clerk — no custom profile page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current identity (from the app's auth session). */}
        <div className="flex items-center gap-4 rounded-xl border border-border-subtle p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback style={{ background: user?.avatarColor ?? "var(--color-signal)" }} className="text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{user?.name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</div>
          </div>
          {user?.role && <Badge variant="neutral" className="ml-auto">{user.role}</Badge>}
        </div>

        {/* Clerk <UserProfile /> mounts here. */}
        <div className="rounded-xl border border-dashed border-border-default bg-surface/50 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-signal" />
            <span className="text-sm font-medium text-foreground">Managed by Clerk</span>
            <Badge variant="warning" className="ml-auto">Integration pending</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            When Clerk is configured, its <code className="font-mono-data">&lt;UserProfile /&gt;</code> renders
            here and handles everything below. This app does not build a custom profile page.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CLERK_MANAGED.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs text-muted-foreground">
                <item.icon className="h-3.5 w-3.5 text-signal" /> {item.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
