"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayName = user?.fullName || user?.displayName || user?.name || "User";
  const initials = displayName
    ? displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border-subtle bg-background px-4 md:px-6">
      <button className="p-1 md:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-md p-1 hover:bg-surface-raised" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                {user?.photoURL ? <AvatarImage src={user.photoURL} alt={displayName} /> : null}
                <AvatarFallback style={{ backgroundColor: user?.avatarColor }}>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{displayName}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="text-danger focus:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
