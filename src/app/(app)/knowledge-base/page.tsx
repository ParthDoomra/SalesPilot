import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function KnowledgeBasePage() {
  return (
    <ComingSoon
      title="Knowledge Base"
      description="Templates, reference architectures, and case studies."
      icon={BookOpen}
      sections={["Templates", "Reference architectures", "Case studies", "Policies", "Search"]}
    />
  );
}
