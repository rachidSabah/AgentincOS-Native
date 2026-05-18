import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const providers = await db.provider.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(providers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { name, baseUrl, apiKey } = body;
    name = name?.trim();
    baseUrl = baseUrl?.trim();
    apiKey = apiKey?.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const provider = await db.provider.upsert({
      where: { name },
      update: { baseUrl, apiKey },
      create: { name, baseUrl, apiKey },
    });

    return NextResponse.json(provider);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
