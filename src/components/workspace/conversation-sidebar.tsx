/**
 * Conversation Sidebar — lists past conversations for the current project
 * and allows creating new ones.
 */

"use client";

import * as React from 'react';
import { Plus, MessageSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/use-conversations';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSidebarProps {
  projectId: string;
}

export function ConversationSidebar({ projectId }: ConversationSidebarProps) {
  const {
    conversations,
    activeConversationId,
    createConversation,
    selectConversation,
  } = useConversations(projectId);

  const [search, setSearch] = React.useState('');

  const filtered = conversations.filter((c) =>
    !search.trim() || c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col border-r border-border-subtle bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 className="font-display text-sm font-semibold">Conversations</h3>
        <button
          onClick={() => createConversation()}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-signal text-signal-foreground hover:opacity-90 transition-opacity"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-border-subtle bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-signal/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground/60">
              {conversations.length === 0
                ? 'No conversations yet'
                : 'No matches'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              let timeAgo: string;
              try {
                timeAgo = formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true });
              } catch {
                timeAgo = '';
              }

              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-signal-soft border border-signal/20'
                      : 'hover:bg-surface-raised',
                  )}
                >
                  <div className={cn(
                    'truncate text-sm font-medium',
                    isActive ? 'text-signal' : 'text-foreground',
                  )}>
                    {conv.title}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>{conv.messageCount} messages</span>
                    <span>{timeAgo}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
