"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  FileStack,
  BookOpen,
  BarChart3,
  CreditCard,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { useAuth } from "@/lib/auth";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/ai-workspace", label: "AI Workspace", icon: Bot },
  { href: "/proposals", label: "Proposals", icon: FileStack },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "Owner" || user?.role === "Admin";

  const displayName = user?.fullName || user?.displayName || user?.name || "User";
  const initials = displayName
    ? displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="flex h-full w-64 flex-col border-r border-border-subtle bg-surface">
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
        <button className="p-1 md:hidden" onClick={onNavigate} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-signal-soft text-signal"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}

          {isAdmin && (
            <>
              <li className="my-2 border-t border-border-subtle" />
              <li>
                <Link
                  href="/admin"
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-signal-soft text-signal"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Admin
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="border-t border-border-subtle p-4">
        <div className="flex items-center gap-3 rounded-md bg-surface-raised px-3 py-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            {user?.photoURL ? <AvatarImage src={user.photoURL} alt={displayName} /> : null}
            <AvatarFallback style={{ backgroundColor: user?.avatarColor }}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate font-medium text-foreground">{displayName}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.orgName ?? "Your organization"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
