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

    // Use a transaction for faster import and consistency
    await db.$transaction(async (tx: any) => {
      for (const conv of conversations) {
        // Create conversation
        const newConv = await tx.conversation.create({
          data: {
            id: randomUUID(),
            title: (conv.title || "Imported Chat").substring(0, 200),
            model: conv.model || "gemini-2.5-pro",
            systemPrompt: conv.systemPrompt || null,
          },
        });

        // Import messages in batch if possible (SQLite supports createMany in recent Prisma)
        if (Array.isArray(conv.messages) && conv.messages.length > 0) {
          const messageData = conv.messages.map((msg: any) => ({
            id: randomUUID(),
            conversationId: newConv.id,
            role: msg.role || "user",
            content: msg.content || "",
            attachments: msg.attachments ? JSON.stringify(msg.attachments) : null,
            metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          }));

          // Try createMany for performance
          try {
            await tx.message.createMany({
              data: messageData,
            });
          } catch (e) {
            // Fallback to sequential if createMany fails
            for (const data of messageData) {
              await tx.message.create({ data });
            }
          }
        }

        importedCount++;
      }
    }, {
      timeout: 60000 // 60 seconds timeout for the transaction
    });

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
