import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminPage() {
  return (
    <ComingSoon
      title="Admin Panel"
      description="Visible to Owners and Admins only."
      icon={ShieldCheck}
      sections={["Organizations", "Users", "Subscriptions", "Revenue", "Logs", "System health", "Feature flags", "Analytics"]}
    />
  );
}
