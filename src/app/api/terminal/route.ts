// ============================================================
// Agentic OS V2 — Terminal API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { terminalEngine } from '@/lib/terminal-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      command: string;
      sessionId?: string;
      naturalLanguage?: boolean;
    };

    if (!body.command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // If natural language mode, parse the command first
    let command = body.command;
    if (body.naturalLanguage) {
      command = terminalEngine.parseNaturalLanguage(body.command);
    }

    const result = await terminalEngine.execute(command, body.sessionId);

    return NextResponse.json({
      result,
      translatedCommand: body.naturalLanguage ? command : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
