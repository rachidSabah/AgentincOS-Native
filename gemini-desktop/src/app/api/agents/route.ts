import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error("[AGENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, role, systemPrompt, avatar, skills } = body;

    if (!name || !role || !systemPrompt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const agent = await db.agent.create({
      data: {
        name,
        role,
        systemPrompt,
        avatar,
        skills,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[AGENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
