import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Format for export
    const exportData = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      systemPrompt: conv.systemPrompt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        createdAt: msg.createdAt,
      })),
    }));

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gemini-chat-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
