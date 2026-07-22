import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/types";

const STATUS_VARIANT: Record<ProjectStatus, "default" | "success" | "warning" | "danger" | "neutral"> = {
  Discovery: "neutral",
  "In Progress": "default",
  "Proposal Sent": "warning",
  Won: "success",
  Lost: "danger",
  Archived: "neutral",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
