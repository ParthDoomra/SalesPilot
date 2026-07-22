/**
 * Conversation Store — client-side state for the active conversation.
 *
 * Manages the message list, streaming state, and active conversation ID.
 * Persisted to localStorage so conversations survive page refreshes.
 */

"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Conversation } from '@/types';

interface ConversationState {
  /** All conversations for the current project. */
  conversations: Conversation[];
  /** The currently active conversation. */
  activeConversationId: string | null;
  /** Messages for the active conversation. */
  messages: Message[];
  /** Whether the AI is currently generating a response. */
  isStreaming: boolean;
  /** Partial content being streamed. */
  streamingContent: string;
  /** Error message from the last failed request. */
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,
};

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setConversations: (conversations) => set({ conversations }),

      setActiveConversation: (id) =>
        set({ activeConversationId: id, messages: [], error: null }),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set({ messages: [...get().messages, message] }),

      updateMessage: (id, patch) =>
        set({
          messages: get().messages.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        }),

      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      setStreamingContent: (content) => set({ streamingContent: content }),

      appendStreamingContent: (chunk) =>
        set({ streamingContent: get().streamingContent + chunk }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'salespilot_conversation',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);
