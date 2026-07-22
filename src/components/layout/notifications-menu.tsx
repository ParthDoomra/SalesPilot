"use client";

import { Bell, FileStack, FolderKanban, UserPlus, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NOTIFICATIONS } from "@/lib/mock-data";

const ICONS: Record<string, typeof FileStack> = {
  "Proposal Generated": FileStack,
  "Project Updated": FolderKanban,
  "Member Invited": UserPlus,
  "Subscription Renewed": CreditCard,
};

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NOTIFICATIONS.map((n) => {
          const Icon = ICONS[n.title] ?? Bell;
          return (
            <div key={n.id} className="flex items-start gap-3 rounded-sm px-2 py-2 text-sm hover:bg-surface-raised">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{n.title}</div>
                <div className="truncate text-xs text-muted-foreground">{n.detail}</div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
