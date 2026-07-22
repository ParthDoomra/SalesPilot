/**
 * useConversations — manages conversation list and creation for a project.
 */

"use client";

import * as React from 'react';
import { useConversationStore } from '@/features/workspace/stores/conversation-store';

export function useConversations(projectId: string) {
  const {
    conversations,
    activeConversationId,
    setConversations,
    setActiveConversation,
    setMessages,
  } = useConversationStore();

  // Load conversations on mount
  React.useEffect(() => {
    if (projectId) loadConversations();
  }, [projectId]);

  async function loadConversations() {
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch {
      // Silent fail
    }
  }

  /**
   * Create a new conversation and set it as active.
   */
  async function createConversation(title?: string) {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: title ?? 'New Conversation' }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations([data.conversation, ...conversations]);
        setActiveConversation(data.conversation.id);
        setMessages([]);
        return data.conversation.id as string;
      }
    } catch {
      // Fallback: create locally
    }

    // Local fallback
    setActiveConversation(id);
    setMessages([]);
    return id;
  }

  function selectConversation(id: string) {
    setActiveConversation(id);
    setMessages([]); // Will be reloaded by useChat
  }

  return {
    conversations,
    activeConversationId,
    loadConversations,
    createConversation,
    selectConversation,
  };
}
