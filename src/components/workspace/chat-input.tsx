/**
 * Chat Input — auto-resizing textarea with send button, quick option chips, and keyboard shortcuts.
 */

"use client";

import * as React from 'react';
import { SendHorizonal, Loader2, Sparkles, Server, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  placeholder?: string;
  hasMessages?: boolean;
}

export function ChatInput({ onSend, isStreaming, placeholder, hasMessages }: ChatInputProps) {
  const [value, setValue] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleSubmit(overrideText?: string) {
    const textToSend = (overrideText ?? value).trim();
    if (!textToSend || isStreaming) return;
    onSend(textToSend);
    if (!overrideText) {
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-border-subtle bg-surface px-4 py-3">
      {/* Quick Action Chips when chatting */}
      {hasMessages && !isStreaming && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleSubmit("Recommend for me (Your Choice)")}
            className="flex items-center gap-1 rounded-full border border-signal/30 bg-signal-soft px-2.5 py-1 text-xs font-medium text-signal transition-colors hover:bg-signal hover:text-signal-foreground"
            title="Let the AI choose standard enterprise defaults"
          >
            <Sparkles className="h-3 w-3" /> Recommend for me (Your Choice)
          </button>

          <button
            onClick={() => handleSubmit("Use AWS with PostgreSQL and 99.9% SLA")}
            className="flex items-center gap-1 rounded-full border border-border-default bg-surface-raised px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-signal/40 hover:text-foreground"
          >
            <Server className="h-3 w-3" /> AWS + PostgreSQL
          </button>

          <button
            onClick={() => handleSubmit("Use enterprise security with SOC 2 & HIPAA baseline")}
            className="flex items-center gap-1 rounded-full border border-border-default bg-surface-raised px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-signal/40 hover:text-foreground"
          >
            <ShieldCheck className="h-3 w-3" /> Standard Security & Compliance
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2 rounded-xl border border-border-default bg-background p-2 transition-colors focus-within:border-signal/50">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Describe your requirements or type "Recommend for me"…'}
          disabled={isStreaming}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50',
          )}
        />

        <button
          onClick={() => handleSubmit()}
          disabled={!value.trim() || isStreaming}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all',
            value.trim() && !isStreaming
              ? 'bg-signal text-signal-foreground hover:opacity-90 shadow-sm'
              : 'text-muted-foreground/40',
          )}
          title="Send message (Enter)"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
        Press <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to send · <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 text-[9px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
