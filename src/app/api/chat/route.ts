/**
 * POST /api/chat
 *
 * Accepts a user message, runs it through the Requirement Agent,
 * persists everything to Firebase, and returns the agent's response.
 *
 * The Claude API key never touches the client — all AI calls happen here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/services/ai/requirement-agent';
import { createConversation, getConversation, updateConversation } from '@/services/firebase/conversations';
import { createMessage as fbCreateMessage, listMessages } from '@/services/firebase/messages';
import { getRequirement, saveRequirement } from '@/services/firebase/requirements';
import { createVersion } from '@/services/firebase/requirement-versions';
import { manageConversationMemory } from '@/services/ai/memory/conversation-memory';
import { createEmptyRequirement } from '@/types';
import type { Message, Conversation } from '@/types';
import { classifyError, AIServiceError } from '@/utils/error-handler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('API:Chat');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, conversationId, message } = body as {
      projectId: string;
      conversationId: string;
      message: string;
    };

    // ── Validate ───────────────────────────────────────────────────────
    if (!projectId || !conversationId || !message?.trim()) {
      return NextResponse.json(
        { error: 'projectId, conversationId, and message are required' },
        { status: 400 },
      );
    }

    // ── Ensure conversation exists ─────────────────────────────────────
    let conversation = await getConversation(conversationId);
    if (!conversation) {
      const newConv: Conversation = {
        id: conversationId,
        projectId,
        title: message.slice(0, 60) + (message.length > 60 ? '…' : ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        status: 'active',
      };
      conversation = await createConversation(newConv);
    }

    // ── Store user message ─────────────────────────────────────────────
    const userMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userMessage: Message = {
      id: userMsgId,
      conversationId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    await fbCreateMessage(userMessage);

    // ── Load context ───────────────────────────────────────────────────
    const allMessages = await listMessages(conversationId);
    const { recentMessages, summary } = await manageConversationMemory(allMessages);

    // ── Load or create requirement ─────────────────────────────────────
    let requirement = await getRequirement(projectId);
    if (!requirement) {
      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      requirement = createEmptyRequirement(projectId, reqId);
      await saveRequirement(requirement);
    }

    // ── Process through Requirement Agent ──────────────────────────────
    const result = await processMessage({
      userMessage: message,
      context: {
        projectId,
        conversationId,
        requirementSnapshot: requirement as unknown as Record<string, unknown>,
        recentMessages,
        conversationSummary: summary,
      },
      currentRequirement: requirement,
      messageId: userMsgId,
    });

    // ── Store assistant message ────────────────────────────────────────
    const assistantMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const assistantMessage: Message = {
      id: assistantMsgId,
      conversationId,
      role: 'assistant',
      content: result.agentResponse.message,
      createdAt: new Date().toISOString(),
      metadata: {
        tokensUsed: result.agentResponse.metadata.tokensUsed,
        latencyMs: result.agentResponse.metadata.latencyMs,
        extractedFields: result.changedFields,
        model: result.agentResponse.metadata.model,
      },
    };
    await fbCreateMessage(assistantMessage);

    // ── Save updated requirement ───────────────────────────────────────
    await saveRequirement(result.updatedRequirement);

    // ── Create version snapshot if fields changed ──────────────────────
    if (result.changedFields.length > 0) {
      await createVersion(result.updatedRequirement, result.changedFields as import('@/types').RequirementFieldKey[]);
    }

    // ── Update conversation metadata ───────────────────────────────────
    await updateConversation(conversationId, {
      updatedAt: new Date().toISOString(),
      messageCount: (conversation.messageCount ?? 0) + 2,
    });

    logger.info('Chat processed successfully', {
      projectId,
      conversationId,
      changedFields: result.changedFields,
    });

    return NextResponse.json({
      agentResponse: result.agentResponse,
      updatedRequirement: result.updatedRequirement,
      conversationId,
      userMessageId: userMsgId,
      assistantMessageId: assistantMsgId,
    });
  } catch (err) {
    const classified = err instanceof AIServiceError ? err : classifyError(err);
    logger.error('Chat endpoint error', {
      code: classified.code,
      message: classified.message,
    });
    return NextResponse.json(
      { error: classified.userMessage, code: classified.code },
      { status: classified.code === 'RATE_LIMITED' ? 429 : 500 },
    );
  }
}
