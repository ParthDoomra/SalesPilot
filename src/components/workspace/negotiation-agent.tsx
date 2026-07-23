/**
 * NegotiationAgentContainer — Conversational AI Sales Engineer.
 *
 * Placed within the Project detail page. Grounded in the project's single source of truth
 * (Requirement JSON, Architecture, Pricing Estimate, Proposal, and Customer Constraints).
 * Offers simple business English guidance, conversational negotiation assistance, and Firebase history persistence.
 */

"use client";

import * as React from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Building2,
  CircleDollarSign,
  Cloud,
  MessageSquare,
} from 'lucide-react';
import type { Message } from '@/types';
import type { NegotiationActionType } from '@/services/ai/negotiation-agent';
import { extractHumanText } from '@/services/ai/negotiation-agent';
import { useRequirements } from '@/hooks/use-requirements';
import { useArchitecture } from '@/hooks/use-architecture';
import { usePricing } from '@/hooks/use-pricing';
import { useProjectCurrency } from '@/hooks/use-project-currency';

interface NegotiationAgentProps {
  projectId: string;
}

const FEATURED_PROMPTS = [
  'Reduce cost by 20%',
  'Customer prefers Azure',
  'Customer budget is ₹2 lakh/month',
  'Explain why this service is required',
  'Suggest cheaper alternatives',
  'Compare AWS vs Azure',
  'Prepare answers to customer objections',
  'Generate a negotiation strategy',
  'Create three pricing options (Budget, Recommended, Premium)',
];

export function NegotiationAgentContainer({ projectId }: NegotiationAgentProps) {
  const { requirement } = useRequirements(projectId);
  const { architecture } = useArchitecture(projectId);
  const { estimate, activeOption } = usePricing(projectId);
  const { currencyCode, formatFromUsd, format } = useProjectCurrency(projectId);

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load existing negotiation conversation session from Firebase on mount
  React.useEffect(() => {
    let active = true;
    async function loadHistory() {
      try {
        const res = await fetch(`/api/negotiation?projectId=${projectId}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.conversationId) {
            setConversationId(data.conversationId);
          }
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            // Auto-generate initial welcome message if no prior messages exist
            handleSendInitialWelcome(data.conversationId);
          }
        }
      } catch {
        // Non-fatal fallback
      } finally {
        if (active) setInitialLoaded(true);
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [projectId]);

  // Auto-scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSendInitialWelcome(existingConvId?: string) {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: 'welcome',
          actionType: 'welcome',
          conversationId: existingConvId || conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);
        if (Array.isArray(data.messages)) setMessages(data.messages);
      }
    } catch {
      // Ignore initial welcome failure
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(userMessageText?: string, actionType?: NegotiationActionType) {
    const promptText = userMessageText ?? input;
    if (!promptText.trim() && !actionType) return;
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    if (!userMessageText && !actionType) setInput('');

    try {
      const res = await fetch('/api/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: promptText,
          actionType,
          conversationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate negotiation advice.');
      }

      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Error generating negotiation response.');
    } finally {
      setIsLoading(false);
    }
  }

  // Exact project indicators from Pricing Engine & Requirements
  const companyName = String(requirement?.company?.value || 'Client Organization');
  const provider = architecture?.selectedProvider || estimate?.provider || 'Azure';

  const monthlyCostUSD = activeOption?.monthlyCost ?? activeOption?.budgetAnalysis?.estimatedMonthlyCostUSD ?? 12000;
  const formattedMonthlyCost = `${formatFromUsd(monthlyCostUSD, currencyCode)}/month`;

  const budgetUSD = activeOption?.budgetAnalysis?.customerBudget ?? (requirement?.budget?.value ? Number(requirement.budget.value) : 0);
  const formattedBudget = budgetUSD > 0 ? `${format(budgetUSD, currencyCode)}/month` : 'Not specified';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header Context Bar */}
      <div className="shrink-0 border-b border-border-subtle bg-surface px-5 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-soft text-signal shadow-xs">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                AI Sales Engineer Assistant
                <span className="rounded-md bg-signal/10 px-2 py-0.5 text-[10px] font-medium text-signal">
                  Simple Business English Mode
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Helping you negotiate with {companyName} using project requirements, architecture & exact pricing reports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 shadow-xs">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              <strong className="text-foreground">{companyName}</strong>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 shadow-xs">
              <CircleDollarSign className="h-3 w-3 text-success" />
              <span className="text-muted-foreground">Monthly Cost:</span>
              <strong className="text-foreground">{formattedMonthlyCost}</strong>
            </div>

            {budgetUSD > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 shadow-xs">
                <span className="text-muted-foreground">Target Budget:</span>
                <strong className="text-foreground">{formattedBudget}</strong>
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 shadow-xs">
              <Cloud className="h-3 w-3 text-signal" />
              <span className="text-muted-foreground">Provider:</span>
              <strong className="text-foreground">{provider}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Negotiation Prompts Bar (Single Scrollable Row) */}
      <div className="shrink-0 border-b border-border-subtle/60 bg-surface/50 px-5 py-2">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-signal" /> Strategies:
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-x-auto text-xs py-0.5 no-scrollbar">
            {FEATURED_PROMPTS.map((promptText) => (
              <button
                key={promptText}
                onClick={() => handleSend(promptText)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-border-default bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-signal/50 hover:text-foreground hover:bg-surface-raised transition-all disabled:opacity-50 shadow-xs"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Conversational Chat Thread (Spacious & Scrollable Layout) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-72 flex-col items-center justify-center text-center p-8 border border-dashed border-border-default rounded-3xl bg-surface/30">
              <MessageSquare className="h-12 w-12 text-signal mb-4" />
              <h4 className="font-display text-base font-semibold text-foreground">AI Sales Engineer Negotiation Session</h4>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
                Generates a project-grounded negotiation overview in simple business English using exact pricing calculations.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 text-xs ${
                msg.sender === 'user' || msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {(msg.sender === 'assistant' || msg.role === 'assistant') && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-signal-soft text-signal shadow-xs mt-1">
                  <Bot className="h-5 w-5" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-3xl p-5 sm:p-6 space-y-3 leading-relaxed text-sm ${
                  msg.sender === 'user' || msg.role === 'user'
                    ? 'bg-signal text-signal-foreground font-medium shadow-xs'
                    : 'border border-border-subtle bg-surface text-foreground shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{extractHumanText(msg.content)}</div>
              </div>

              {(msg.sender === 'user' || msg.role === 'user') && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-muted-foreground border border-border-default shadow-xs mt-1">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground p-4 rounded-2xl border border-border-subtle bg-surface w-fit shadow-xs">
              <Loader2 className="h-4 w-4 animate-spin text-signal" />
              <span>AI Sales Engineer formulating project negotiation response…</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-xs text-danger">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="shrink-0 border-t border-border-subtle bg-surface p-4">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Sales Engineer (e.g., 'Reduce cost by 20%', 'Customer prefers Azure', 'Customer budget is ₹2 lakh/month'…)"
              className="flex-1 rounded-2xl border border-border-default bg-background px-5 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-2 rounded-2xl bg-signal px-5 py-3 text-xs font-semibold text-signal-foreground hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
