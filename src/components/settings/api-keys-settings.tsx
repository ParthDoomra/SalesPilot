"use client";

import { RefreshCw, Database, Webhook, ShieldCheck, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * API Keys — integration surface, structured for future expansion.
 *
 * Each integration is a self-contained row so new providers can be added by
 * appending to the list. Server-side AI provider keys (Anthropic/OpenAI) are
 * intentionally NOT surfaced here — they live only in server env vars.
 */

export function ApiKeysSettings() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>API keys &amp; integrations</CardTitle>
          <CardDescription>Connect external services. More integrations coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Exchange Rate API — live today (no key required). */}
          <div className="rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-signal" />
                <span className="text-sm font-medium text-foreground">Exchange Rate API</span>
              </div>
              <Badge variant="success"><ShieldCheck className="h-3 w-3" /> Connected</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Live currency conversion via Frankfurter. No API key required; rates are cached for 24 hours.
            </p>
          </div>

          {/* CRM Integration — placeholder. */}
          <div className="rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">CRM integration</span>
              </div>
              <Badge variant="neutral">Coming soon</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Sync customers and deals with your CRM (Salesforce, HubSpot, …).
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input placeholder="CRM API key" disabled className="flex-1" />
              <Button variant="outline" disabled>Connect</Button>
            </div>
          </div>

          {/* Webhooks — placeholder. */}
          <div className="rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Webhooks</span>
              </div>
              <Badge variant="neutral">Coming soon</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Notify external systems when proposals, pricing, or projects change.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input placeholder="https://example.com/webhook" disabled className="flex-1" />
              <Button variant="outline" disabled>Add webhook</Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-raised/40 px-4 py-3 text-[11px] text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              AI provider keys (Anthropic, OpenAI) are managed securely on the server and are never exposed
              in the client or this settings page.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
