import { User } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ProfilePage() {
  return (
    <ComingSoon
      title="User Profile"
      description="Your personal account details."
      icon={User}
      sections={["Avatar", "Contact info", "Password", "Preferences"]}
    />
  );
}
