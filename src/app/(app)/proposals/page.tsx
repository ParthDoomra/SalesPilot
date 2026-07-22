import { FileStack } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ProposalsPage() {
  return (
    <ComingSoon
      title="Proposal Center"
      description="Manage, preview, and export customer proposals."
      icon={FileStack}
      sections={["Proposal list", "Preview", "Version history", "Export", "Approval status"]}
    />
  );
}
