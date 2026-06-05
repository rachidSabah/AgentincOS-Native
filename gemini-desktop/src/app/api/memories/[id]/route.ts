import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, key } = body;

    const data: Record<string, string> = {};
    if (content !== undefined) data.content = content;
    if (key !== undefined) data.key = key;

    if (Object.keys(data).length === 0) {
      return new NextResponse("Nothing to update", { status: 400 });
    }

    const memory = await db.memory.update({
      where: { id },
      data,
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("[MEMORY_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.memory.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[MEMORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
