import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const existingMessage = await db.message.findUnique({ where: { id } });
    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMessage.role !== "user") {
      return NextResponse.json({ error: "Only user messages can be edited" }, { status: 403 });
    }

    const message = await db.message.update({
      where: { id },
      data: {
        content,
        edited: true,
      },
    });

    return NextResponse.json(message);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to edit message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const cascade = searchParams.get("cascade") === "true";

    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (cascade) {
      const laterMessages = await db.message.findMany({
        where: {
          conversationId: message.conversationId,
          createdAt: { gt: message.createdAt },
        },
      });

      await db.message.deleteMany({
        where: {
          id: { in: laterMessages.map((m) => m.id) },
        },
      });
    }

    await db.message.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
