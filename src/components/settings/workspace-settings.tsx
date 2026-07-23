"use client";

import * as React from "react";
import { Save, Upload, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  useWorkspaceSettingsStore,
  CLOUD_PROVIDER_OPTIONS,
  TIME_ZONE_OPTIONS,
} from "@/lib/workspace-settings-store";
import { useDisplayCurrencyStore } from "@/lib/display-currency-store";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/services/currency/constants";

export function WorkspaceSettings() {
  const { user } = useAuth();
  const settings = useWorkspaceSettingsStore();
  const displayCurrency = useDisplayCurrencyStore((s) => s.currency);
  const setDisplayCurrency = useDisplayCurrencyStore((s) => s.setCurrency);

  const [name, setName] = React.useState(settings.workspaceName || user?.orgName || "");
  const [logo, setLogo] = React.useState(settings.companyLogo);
  const [currency, setCurrency] = React.useState<string>(displayCurrency);
  const [provider, setProvider] = React.useState(settings.defaultProvider);
  const [timeZone, setTimeZone] = React.useState(settings.timeZone);
  const [saved, setSaved] = React.useState(false);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    settings.set({ workspaceName: name.trim(), companyLogo: logo, defaultProvider: provider, timeZone });
    setDisplayCurrency(currency as SupportedCurrency);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Organization details and defaults applied across the workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              {logo ? <AvatarImage src={logo} alt="Company logo" /> : null}
              <AvatarFallback className="rounded-xl bg-signal-soft text-signal">
                {(name || "W").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="ws-logo" className="mb-1.5 block">Company logo</Label>
              <label
                htmlFor="ws-logo"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-2 text-xs font-medium hover:border-signal/50"
              >
                <Upload className="h-3.5 w-3.5" /> Upload logo
              </label>
              <input id="ws-logo" type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Default currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Default cloud provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLOUD_PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Time zone</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_ZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-4 w-4" /> Workspace settings saved
              </span>
            )}
            <Button type="submit"><Save className="h-4 w-4" /> Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
