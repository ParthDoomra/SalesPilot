/**
 * useChat — primary hook for the chat UI.
 *
 * Orchestrates sending messages to the /api/chat endpoint, updating
 * both the conversation store and requirement store, and handling
 * streaming, errors, and retry logic.
 */

"use client";

import * as React from 'react';
import { useConversationStore } from '@/features/workspace/stores/conversation-store';
import { useRequirementStore } from '@/features/workspace/stores/requirement-store';
import type { Message } from '@/types';

interface UseChatOptions {
  projectId: string;
  conversationId: string;
}

export function useChat({ projectId, conversationId }: UseChatOptions) {
  const {
    messages,
    isStreaming,
    error,
    addMessage,
    updateMessage,
    setMessages,
    setIsStreaming,
    setError,
  } = useConversationStore();

  const { setRequirement, setValidationIssues } = useRequirementStore();

  // Load messages for this conversation on mount
  React.useEffect(() => {
    if (!conversationId) return;
    loadMessages(conversationId);
  }, [conversationId]);

  async function loadMessages(convId: string) {
    try {
      // Messages are loaded from the API or kept in store
      // For now the store is the source of truth during a session
    } catch {
      // Silent fail — messages stay empty
    }
  }

  /**
   * Send a user message and process the AI response.
   */
  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    setError(null);

    // Optimistically add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Show typing indicator
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, conversationId, message: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();

      // Add assistant message
      const assistantMsg: Message = {
        id: data.assistantMessageId ?? `msg_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: data.agentResponse.message,
        createdAt: new Date().toISOString(),
        metadata: data.agentResponse.metadata,
      };
      addMessage(assistantMsg);

      // Update requirement store
      if (data.updatedRequirement) {
        setRequirement(data.updatedRequirement);
      }
      if (data.agentResponse.validationIssues) {
        setValidationIssues(data.agentResponse.validationIssues);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);

      // Add error message to chat
      addMessage({
        id: `msg_err_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
    }
  }

  /**
   * Retry the last user message.
   */
  async function retryLastMessage() {
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (!lastUserMsg) return;

    // Remove the last assistant message (error or actual)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      setMessages(messages.slice(0, -1));
    }

    await sendMessage(lastUserMsg.content);
  }

  /**
   * Edit a previously sent message and resubmit.
   */
  async function editMessage(messageId: string, newContent: string) {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Update the message
    updateMessage(messageId, {
      content: newContent,
      edited: true,
      originalContent: messages[msgIndex].content,
    });

    // Remove all messages after the edited one
    setMessages(messages.slice(0, msgIndex + 1));

    // Resubmit
    await sendMessage(newContent);
  }

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    retryLastMessage,
    editMessage,
  };
}
