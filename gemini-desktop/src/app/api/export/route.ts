import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, format } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (format === "markdown") {
      let md = `# ${conversation.title}\n\n`;
      md += `*Model: ${conversation.model}*`;
      if (conversation.systemPrompt) {
        md += `\n\n> **System Prompt:** ${conversation.systemPrompt}\n`;
      }
      md += `\n\n## Messages\n`;

      for (const msg of conversation.messages) {
        const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        md += `\n**${roleLabel}:** ${msg.content}\n`;

        if (msg.toolCalls) {
          try {
            const tools = JSON.parse(msg.toolCalls);
            if (Array.isArray(tools) && tools.length > 0) {
              md += `\n\`\`\`json\n// Tool Calls\n${JSON.stringify(tools, null, 2)}\n\`\`\`\n`;
            }
          } catch { /* skip invalid JSON */ }
        }

        if (msg.attachments) {
          try {
            const atts = JSON.parse(msg.attachments);
            if (Array.isArray(atts) && atts.length > 0) {
              md += `\n*Attachments:* ${atts.map((a: { name?: string }) => a.name || "file").join(", ")}\n`;
            }
          } catch { /* skip invalid JSON */ }
        }
      }

      const fileName = `${conversation.title.replace(/[^a-zA-Z0-9_-]/g, "_")}-${new Date().toISOString().split("T")[0]}.md`;

      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    if (format === "json") {
      const exportData = {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        systemPrompt: conversation.systemPrompt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : null,
          createdAt: msg.createdAt,
        })),
      };

      const fileName = `${conversation.title.replace(/[^a-zA-Z0-9_-]/g, "_")}-${new Date().toISOString().split("T")[0]}.json`;

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use 'markdown' or 'json'." }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
