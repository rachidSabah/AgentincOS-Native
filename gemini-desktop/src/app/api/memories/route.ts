import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";

    let memories;
    if (search) {
      memories = await db.memory.findMany({
        where: {
          OR: [
            { key: { contains: search } },
            { content: { contains: search } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      memories = await db.memory.findMany({
        orderBy: { updatedAt: "desc" },
      });
    }

    return NextResponse.json(memories);
  } catch (error) {
    console.error("[MEMORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, content, source } = body;

    if (!key || !content) {
      return new NextResponse("Key and Content are required", { status: 400 });
    }

    const memory = await db.memory.create({
      data: {
        key,
        content,
        source: source || "manual",
      },
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("[MEMORIES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
