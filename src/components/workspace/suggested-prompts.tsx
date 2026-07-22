/**
 * Suggested Prompts — displayed when a conversation is empty.
 */

"use client";

import { Server, HeartPulse, ShoppingCart, Database, GitBranch, Landmark } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '@/constants/suggested-prompts';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  HeartPulse,
  ShoppingCart,
  Database,
  GitBranch,
  Landmark,
};

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal">
        <Server className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Requirement Intelligence Agent
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Describe your customer&apos;s needs and I&apos;ll extract structured requirements, identify gaps, and help you build a complete scope.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => {
          const Icon = ICON_MAP[prompt.icon] ?? Server;
          return (
            <button
              key={prompt.label}
              onClick={() => onSelect(prompt.prompt)}
              className="group flex items-start gap-3 rounded-xl border border-border-default bg-surface p-4 text-left transition-all hover:border-signal/40 hover:bg-surface-raised hover:shadow-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-signal transition-colors group-hover:bg-signal group-hover:text-signal-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{prompt.label}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {prompt.prompt}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
