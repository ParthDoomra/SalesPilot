/**
 * POST /api/negotiation
 *
 * Runs the AI Negotiation Agent using the project's single source of truth
 * (Requirement JSON, Architecture, Pricing, and Proposal), persists the message
 * history under the current project in Firebase, and returns structured guidance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateNegotiationResponse } from '@/services/ai/negotiation-agent';
import type { NegotiationActionType } from '@/services/ai/negotiation-agent';
import { listConversations, createConversation } from '@/services/firebase/conversations';
import { createMessage, listMessages } from '@/services/firebase/messages';
import type { Message, Conversation } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, actionType, conversationId: requestedConvId } = body as {
      projectId: string;
      message?: string;
      actionType?: NegotiationActionType;
      conversationId?: string;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const userPrompt = message?.trim() || (actionType ? `Execute quick action: ${actionType}` : 'Provide negotiation guidance.');

    // 1. Resolve or create project negotiation conversation session
    let conversationId = requestedConvId;

    if (!conversationId) {
      const existingConvs = await listConversations(projectId);
      const negotiationConv = existingConvs.find((c) => c.title?.toLowerCase().includes('negotiation') || c.type === 'negotiation');

      if (negotiationConv) {
        conversationId = negotiationConv.id;
      } else {
        conversationId = `conv_neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newConv: Conversation = {
          id: conversationId,
          projectId,
          title: 'AI Negotiation Strategy',
          type: 'negotiation',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0,
        };
        await createConversation(newConv);
      }
    }

    // 2. Persist User message to Firebase
    const userMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userMessageObj: Message = {
      id: userMsgId,
      conversationId,
      projectId,
      role: 'user',
      sender: 'user',
      content: userPrompt,
      createdAt: new Date().toISOString(),
    };
    await createMessage(userMessageObj);

    // 3. Generate project-aware AI negotiation response
    const negotiationResult = await generateNegotiationResponse(projectId, userPrompt, actionType);

    // 4. Persist AI Assistant message to Firebase
    const assistantMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const assistantMessageObj: Message = {
      id: assistantMsgId,
      conversationId,
      projectId,
      role: 'assistant',
      sender: 'assistant',
      content: negotiationResult.answer,
      createdAt: new Date().toISOString(),
    };
    await createMessage(assistantMessageObj);

    // 5. Fetch full message history for this conversation
    const history = await listMessages(conversationId);

    return NextResponse.json({
      conversationId,
      result: negotiationResult,
      messages: history,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: errorMsg || 'Failed to process negotiation request.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const conversations = await listConversations(projectId);
  const negotiationConv = conversations.find((c) => c.title?.toLowerCase().includes('negotiation') || c.type === 'negotiation');

  if (!negotiationConv) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  const messages = await listMessages(negotiationConv.id);
  return NextResponse.json({ conversationId: negotiationConv.id, messages });
}
