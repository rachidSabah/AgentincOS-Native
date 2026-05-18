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
    const { id: conversationId } = await params;
    const body = await req.json();
    const { role, content, agentId, attachments, metadata } = body;

    const message = await db.message.create({
      data: {
        conversationId,
        role,
        content,
        agentId,
        attachments: attachments ? JSON.stringify(attachments) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(message);
  } catch (error: unknown) {
    console.error("Failed to create message:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.message.deleteMany({ where: { conversationId: id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete messages";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
