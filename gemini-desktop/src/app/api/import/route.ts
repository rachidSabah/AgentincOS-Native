import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conversations = body.conversations;

    if (!Array.isArray(conversations)) {
      return NextResponse.json({ error: "Invalid format: expected array of conversations" }, { status: 400 });
    }

    let importedCount = 0;

    for (const conv of conversations) {
      // Create conversation with new ID to avoid conflicts
      const newConv = await db.conversation.create({
        data: {
          id: randomUUID(),
          title: (conv.title || "Imported Chat").substring(0, 200),
          model: conv.model || "gemini-2.5-pro",
          systemPrompt: conv.systemPrompt || null,
        },
      });

      // Import messages
      if (Array.isArray(conv.messages)) {
        for (const msg of conv.messages) {
          await db.message.create({
            data: {
              id: randomUUID(),
              conversationId: newConv.id,
              role: msg.role || "user",
              content: msg.content || "",
              attachments: msg.attachments ? JSON.stringify(msg.attachments) : null,
              metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
              createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
            },
          });
        }
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      message: `Successfully imported ${importedCount} conversation(s)`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
