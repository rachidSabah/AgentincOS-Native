import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  hermesFetchQueued,
  findHermesBinaryAsync,
} from "@/lib/hermes";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HermesSession {
  id: string;
  title?: string;
  createdAt?: string;
  model?: string;
  messageCount?: number;
}

interface ListSessionsResponse {
  sessions: HermesSession[];
}

interface CreateSessionBody {
  action: "create";
  title?: string;
}

interface ResumeSessionBody {
  action: "resume";
  sessionId: string;
}

type PostBody = CreateSessionBody | ResumeSessionBody;

interface DeleteBody {
  sessionId: string;
}

interface SingleSessionResponse {
  session: HermesSession;
}

interface DeleteResponse {
  success: boolean;
}

// ---------------------------------------------------------------------------
// GET — List sessions
// ---------------------------------------------------------------------------

export async function GET() {
  // 1. Try Hermes API /v1/sessions first
  try {
    const res = await hermesFetchQueued("/v1/sessions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const sessions: HermesSession[] = Array.isArray(data)
        ? data.map(normalizeSession)
        : Array.isArray(data?.sessions)
          ? data.sessions.map(normalizeSession)
          : [];

      return NextResponse.json<ListSessionsResponse>({ sessions });
    }
  } catch {
    // API unavailable — fall through to CLI
  }

  // 2. Fallback to CLI: hermes sessions list --json
  try {
    const bin = await findHermesBinaryAsync();
    if (bin) {
      const { stdout } = await execFileAsync(bin, [
        "sessions",
        "list",
        "--json",
      ], { timeout: 10000 });

      const parsed = JSON.parse(stdout.trim());
      const sessions: HermesSession[] = Array.isArray(parsed)
        ? parsed.map(normalizeSession)
        : Array.isArray(parsed?.sessions)
          ? parsed.sessions.map(normalizeSession)
          : [];

      return NextResponse.json<ListSessionsResponse>({ sessions });
    }
  } catch {
    // CLI unavailable — fall through to empty
  }

  // 3. Fallback: return empty array
  return NextResponse.json<ListSessionsResponse>({ sessions: [] });
}

// ---------------------------------------------------------------------------
// POST — Create or resume session
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: PostBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || (body.action !== "create" && body.action !== "resume")) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' field. Must be 'create' or 'resume'" },
      { status: 400 },
    );
  }

  // --- Create session ---
  if (body.action === "create") {
    return await handleCreateSession(body.title);
  }

  // --- Resume session ---
  if (body.action === "resume") {
    if (!body.sessionId || typeof body.sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'sessionId' for resume action" },
        { status: 400 },
      );
    }
    return await handleResumeSession(body.sessionId);
  }

  // Unreachable, but satisfies TypeScript
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// DELETE — Delete session
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  let body: DeleteBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'sessionId'" },
      { status: 400 },
    );
  }

  // 1. Try DELETE via Hermes API
  try {
    const res = await hermesFetchQueued(
      `/v1/sessions/${encodeURIComponent(body.sessionId)}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      return NextResponse.json<DeleteResponse>({ success: true });
    }

    // If API returned 404, session may not exist
    if (res.status === 404) {
      return NextResponse.json<DeleteResponse>({ success: false });
    }
  } catch {
    // API unavailable — fall through to CLI
  }

  // 2. Fallback to CLI: hermes sessions delete {id}
  try {
    const bin = await findHermesBinaryAsync();
    if (bin) {
      await execFileAsync(bin, [
        "sessions",
        "delete",
        body.sessionId,
      ], { timeout: 10000 });

      return NextResponse.json<DeleteResponse>({ success: true });
    }
  } catch {
    // CLI failed — fall through to failure response
  }

  return NextResponse.json<DeleteResponse>({ success: false });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSession(raw: Record<string, unknown>): HermesSession {
  return {
    id: String(raw.id ?? raw.session_id ?? ""),
    title: typeof raw.title === "string" ? raw.title : undefined,
    createdAt: typeof raw.created_at === "string"
      || typeof raw.createdAt === "string"
      ? String(raw.created_at ?? raw.createdAt)
      : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
    messageCount: typeof raw.message_count === "number"
      || typeof raw.messageCount === "number"
      ? Number(raw.message_count ?? raw.messageCount)
      : undefined,
  };
}

async function handleCreateSession(
  title?: string,
): Promise<NextResponse> {
  // 1. Try Hermes API POST /v1/sessions
  try {
    const payload: Record<string, unknown> = {};
    if (title) payload.title = title;

    const res = await hermesFetchQueued("/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json<SingleSessionResponse>({
        session: normalizeSession(data),
      });
    }
  } catch {
    // API unavailable — fall through to CLI
  }

  // 2. Fallback to CLI: hermes sessions create --title X
  try {
    const bin = await findHermesBinaryAsync();
    if (bin) {
      const args = ["sessions", "create"];
      if (title) {
        args.push("--title", title);
      }

      const { stdout } = await execFileAsync(bin, args, { timeout: 10000 });
      const data = JSON.parse(stdout.trim());

      return NextResponse.json<SingleSessionResponse>({
        session: normalizeSession(data),
      });
    }
  } catch {
    // CLI unavailable
  }

  return NextResponse.json(
    { error: "Failed to create session: Hermes API and CLI both unavailable" },
    { status: 503 },
  );
}

async function handleResumeSession(
  sessionId: string,
): Promise<NextResponse> {
  // 1. Try Hermes API POST /v1/sessions/{id}/resume
  try {
    const res = await hermesFetchQueued(
      `/v1/sessions/${encodeURIComponent(sessionId)}/resume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json<SingleSessionResponse>({
        session: normalizeSession(data),
      });
    }
  } catch {
    // API unavailable — fall through to no-op
  }

  // 2. Fallback: no-op — just return the session ID as a resumed session
  return NextResponse.json<SingleSessionResponse>({
    session: { id: sessionId },
  });
}
