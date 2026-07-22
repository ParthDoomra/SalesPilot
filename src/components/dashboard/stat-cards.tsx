import { FolderKanban, DollarSign, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SEED_PROJECTS } from "@/lib/mock-data";

export function StatCards() {
  const active = SEED_PROJECTS.filter((p) => !p.archived && p.status !== "Won" && p.status !== "Lost");
  const monthlyTotal = active.reduce((sum, p) => sum + p.monthlyEstimate, 0);

  const stats = [
    {
      label: "Active projects",
      value: active.length.toString(),
      sub: `${SEED_PROJECTS.filter((p) => p.status === "Won").length} won this quarter`,
      icon: FolderKanban,
    },
    {
      label: "Estimated monthly cost",
      value: `$${monthlyTotal.toLocaleString()}`,
      sub: "across active pipeline",
      icon: DollarSign,
    },
    {
      label: "Team members",
      value: "6",
      sub: "2 Sales Engineers, 1 Admin",
      icon: Users,
    },
    {
      label: "AI activity",
      value: "142",
      sub: "requirement queries this week",
      icon: Sparkles,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-soft text-signal">
              <s.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-display text-2xl font-semibold">{s.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
        </Card>
      ))}
    </div>
  );
}
