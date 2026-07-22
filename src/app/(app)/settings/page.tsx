import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Manage your profile, organization, and integrations."
      icon={SettingsIcon}
      sections={["Profile", "Organization", "Branding", "API keys", "Notifications", "Security", "Theme", "Integrations"]}
    />
  );
}
