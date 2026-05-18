import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const agent = await db.agent.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!agent) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[AGENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { name, role, systemPrompt, avatar, skills, isActive } = body;

    const agent = await db.agent.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        role,
        systemPrompt,
        avatar,
        skills,
        isActive,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[AGENT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const agent = await db.agent.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[AGENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
