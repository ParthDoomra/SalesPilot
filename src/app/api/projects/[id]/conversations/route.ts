/**
 * GET /api/projects/[id]/conversations — list conversations for a project
 * POST /api/projects/[id]/conversations — create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { listConversations, createConversation } from '@/services/firebase/conversations';
import type { Conversation } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const conversations = await listConversations(projectId);
  return NextResponse.json({ conversations });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const body = await request.json();
  const now = new Date().toISOString();

  const conversation: Conversation = {
    id: body.id ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    title: body.title ?? 'New Conversation',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    status: 'active',
  };

  const created = await createConversation(conversation);
  return NextResponse.json({ conversation: created }, { status: 201 });
}
