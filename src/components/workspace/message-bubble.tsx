/**
 * Message Bubble — individual chat message with markdown rendering,
 * copy, retry, edit actions, and timestamp.
 */

"use client";

import * as React from 'react';
import { Bot, User, Copy, Check, RotateCcw, Pencil, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
  onEdit?: (id: string, content: string) => void;
  isLast?: boolean;
}

export function MessageBubble({ message, onRetry, onEdit, isLast }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const isUser = message.role === 'user';
  const isError = message.content.startsWith('⚠️');

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEditSubmit() {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 transition-colors',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-signal text-signal-foreground'
            : 'bg-surface-raised border border-border-subtle text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {isEditing ? (
          <div className="w-full">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface p-3 text-sm text-foreground focus:border-signal focus:outline-none resize-none"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit();
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={handleEditSubmit}
                className="rounded-md bg-signal px-3 py-1 text-xs font-medium text-signal-foreground hover:opacity-90"
              >
                Save & Resubmit
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-signal text-signal-foreground rounded-br-md'
                : isError
                  ? 'bg-danger-soft text-danger border border-danger/20 rounded-bl-md'
                  : 'bg-surface-raised border border-border-subtle text-foreground rounded-bl-md',
            )}
          >
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 px-1">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Clock className="h-2.5 w-2.5" />
            {formatTime(message.createdAt)}
          </span>
          {message.edited && (
            <span className="text-[10px] text-muted-foreground/60">(edited)</span>
          )}

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="rounded p-1 text-muted-foreground/60 hover:bg-surface-raised hover:text-foreground"
              title="Copy"
            >
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            </button>

            {isUser && onEdit && (
              <button
                onClick={() => { setEditContent(message.content); setIsEditing(true); }}
                className="rounded p-1 text-muted-foreground/60 hover:bg-surface-raised hover:text-foreground"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}

            {!isUser && isLast && onRetry && (
              <button
                onClick={onRetry}
                className="rounded p-1 text-muted-foreground/60 hover:bg-surface-raised hover:text-foreground"
                title="Retry"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Extracted fields badge */}
        {message.metadata?.extractedFields && message.metadata.extractedFields.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.metadata.extractedFields.map((f) => (
              <span
                key={f}
                className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success"
              >
                ✓ {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
