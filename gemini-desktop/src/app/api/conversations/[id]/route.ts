import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role, content, attachments, metadata, agentId, toolCalls } = body;

    const message = await db.message.create({
      data: {
        conversationId: id,
        agentId: agentId || null,
        role,
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, model, systemPrompt, isFavorite } = body;

    const conversation = await db.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(model !== undefined && { model }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(isFavorite !== undefined && { isFavorite }),
      },
    });

    return NextResponse.json(conversation);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update conversation";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.conversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete conversation";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
