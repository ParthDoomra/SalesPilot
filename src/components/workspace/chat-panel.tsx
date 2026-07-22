/**
 * Chat Panel — main conversation area with message list, auto-scroll,
 * typing indicator, and suggested prompts.
 */

"use client";

import * as React from 'react';
import { Loader2, Bot } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { SuggestedPrompts } from './suggested-prompts';
import { useChat } from '@/hooks/use-chat';

interface ChatPanelProps {
  projectId: string;
  conversationId: string;
}

export function ChatPanel({ projectId, conversationId }: ChatPanelProps) {
  const { messages, isStreaming, error, sendMessage, retryLastMessage, editMessage } =
    useChat({ projectId, conversationId });

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming ? (
          <SuggestedPrompts onSelect={sendMessage} />
        ) : (
          <div className="flex flex-col py-4">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === messages.length - 1}
                onRetry={retryLastMessage}
                onEdit={editMessage}
              />
            ))}

            {/* Typing indicator */}
            {isStreaming && (
              <div className="flex gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised border border-border-subtle text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-raised border border-border-subtle px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-signal [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-signal [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-signal [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-muted-foreground">Analyzing requirements…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
        hasMessages={messages.length > 0}
        placeholder="Describe your customer's requirements…"
      />
    </div>
  );
}
