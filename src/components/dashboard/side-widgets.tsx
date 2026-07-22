import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RECENT_CONVERSATIONS, NOTIFICATIONS } from "@/lib/mock-data";

export function AIActivityWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-signal" /> AI activity
        </CardTitle>
        <CardDescription>Credit usage this billing cycle</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">3,420 / 5,000 credits</span>
          <span className="text-muted-foreground">68%</span>
        </div>
        <Progress value={68} className="mt-2" />
        <p className="mt-3 text-xs text-muted-foreground">Resets in 12 days · placeholder, connects to real usage later</p>
      </CardContent>
    </Card>
  );
}

export function RecentConversationsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent conversations</CardTitle>
        <CardDescription>Latest AI Workspace threads</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {RECENT_CONVERSATIONS.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.project}</span>
              <span className="text-xs text-muted-foreground">{c.time}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</p>
          </div>
        ))}
        <Link href="/ai-workspace" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
          Open AI Workspace <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

const TEAM = [
  { name: "Jordan Avery", role: "Owner", initials: "JA" },
  { name: "Priya Nathan", role: "Sales Engineer", initials: "PN" },
  { name: "Marcus Ilić", role: "Admin", initials: "MI" },
  { name: "Renata Oduya", role: "Viewer", initials: "RO" },
];

export function TeamMembersWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team members</CardTitle>
        <CardDescription>6 members in Northbeam Consulting</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {TEAM.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{m.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.role}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function NotificationsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Recent workspace events</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.time}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
