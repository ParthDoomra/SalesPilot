import { CreditCard } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function BillingPage() {
  return (
    <ComingSoon
      title="Billing"
      description="Manage your subscription and usage."
      icon={CreditCard}
      sections={["Current plan", "Usage", "Projects used", "Storage", "AI credits", "Upgrade"]}
    />
  );
}
