import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    await db.provider.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    let { baseUrl, apiKey, isActive } = body;
    baseUrl = baseUrl?.trim();
    apiKey = apiKey?.trim();

    const provider = await db.provider.update({
      where: { id },
      data: { baseUrl, apiKey, isActive },
    });

    return NextResponse.json(provider);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
