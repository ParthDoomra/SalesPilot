import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Track pipeline, AI usage, and team performance."
      icon={BarChart3}
      sections={["Projects", "AI usage", "Proposal success", "Monthly growth", "Team activity", "Revenue"]}
    />
  );
}
