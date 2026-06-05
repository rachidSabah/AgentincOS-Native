import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to find existing settings
    let settings = { ...DEFAULT_SETTINGS };

    const entries = await db.settings.findMany();
    for (const entry of entries) {
      try {
        (settings as Record<string, unknown>)[entry.key] = JSON.parse(entry.value);
      } catch {
        (settings as Record<string, unknown>)[entry.key] = entry.value;
      }
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    // If table doesn't exist yet, return defaults
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = body as Partial<AppSettings>;

    // Upsert each setting key-value pair
    for (const [key, value] of Object.entries(settings)) {
      await db.settings.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
