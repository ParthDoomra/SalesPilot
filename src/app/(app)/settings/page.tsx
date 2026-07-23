"use client";

/**
 * Settings — Workspace, Account (Clerk), Team, API Keys, and Preferences.
 *
 * Each area is a self-contained, modular section component so the page stays
 * simple and future sections can be added by dropping in a new tab. Rendering
 * is deferred until after mount because the section components read persisted
 * (localStorage) stores + theme, which would otherwise mismatch the server
 * markup.
 */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkspaceSettings } from "@/components/settings/workspace-settings";
import { AccountSettings } from "@/components/settings/account-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { ApiKeysSettings } from "@/components/settings/api-keys-settings";
import { PreferencesSettings } from "@/components/settings/preferences-settings";

const TABS = [
  { value: "Workspace", label: "Workspace" },
  { value: "Account", label: "Account" },
  { value: "Team", label: "Team" },
  { value: "ApiKeys", label: "API Keys" },
  { value: "Preferences", label: "Preferences" },
];

export default function SettingsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div>
      <PageHeader title="Settings" description="Manage your workspace, account, team, and preferences." />

      {!mounted ? (
        <Card className="h-64 animate-pulse" />
      ) : (
        <Tabs defaultValue="Workspace">
          <TabsList className="mb-6 flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="Workspace">
            <WorkspaceSettings />
          </TabsContent>
          <TabsContent value="Account">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="Team">
            <TeamSettings />
          </TabsContent>
          <TabsContent value="ApiKeys">
            <ApiKeysSettings />
          </TabsContent>
          <TabsContent value="Preferences">
            <PreferencesSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
