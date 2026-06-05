import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversations";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, model, systemPrompt } = body;

    const conversation = await db.conversation.create({
      data: {
        title: title || "New Chat",
        model: model || "gemini-2.5-pro",
        systemPrompt: systemPrompt || null,
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create conversation";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
