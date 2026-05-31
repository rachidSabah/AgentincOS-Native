import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageType = "task" | "result" | "query" | "broadcast" | "error";
type MessagePriority = "low" | "medium" | "high" | "critical";
type MessageStatus = "pending" | "delivered" | "read" | "failed";

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  subject: string;
  payload: Record<string, unknown>;
  priority: MessagePriority;
  timestamp: number;
  status: MessageStatus;
  retries: number;
}

interface SendMessageRequest {
  from: string;
  to: string;
  type: MessageType;
  subject: string;
  payload?: Record<string, unknown>;
  priority?: MessagePriority;
}

interface DeadLetterEntry {
  message: AgentMessage;
  reason: string;
  failedAt: number;
}

interface MessageBusStats {
  totalMessages: number;
  activeChannels: number;
  recentMessages: AgentMessage[];
  agentInboxes: Record<string, number>;
  deadLetterCount: number;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const MAX_INBOX_SIZE = 100;
const KNOWN_AGENTS = ["claude", "hermes", "openclaw", "vault"] as const;

/** Agent inbox: Map<agentId, AgentMessage[]> */
const agentInboxes = new Map<string, AgentMessage[]>();

/** All messages ever sent (for stats), capped to last 1000 */
const messageLog: AgentMessage[] = [];
const MAX_LOG_SIZE = 1000;

/** Dead letter queue for failed deliveries */
const deadLetterQueue: DeadLetterEntry[] = [];

/** Initialize inboxes for all known agents */
for (const agent of KNOWN_AGENTS) {
  agentInboxes.set(agent, []);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const PRIORITY_ORDER: Record<MessagePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Insert a message into an agent inbox, keeping it sorted by priority then time, capped at MAX_INBOX_SIZE. */
function insertIntoInbox(agentId: string, message: AgentMessage): void {
  let inbox = agentInboxes.get(agentId);
  if (!inbox) {
    inbox = [];
    agentInboxes.set(agentId, inbox);
  }

  inbox.push(message);
  inbox.sort((a, b) => {
    const prioDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return a.timestamp - b.timestamp;
  });

  // Evict oldest low-priority messages when inbox is full
  if (inbox.length > MAX_INBOX_SIZE) {
    const evicted = inbox.splice(MAX_INBOX_SIZE);
    for (const msg of evicted) {
      msg.status = "failed";
      deadLetterQueue.push({
        message: msg,
        reason: "Inbox overflow — evicted to stay within capacity",
        failedAt: Date.now(),
      });
    }
  }
}

/** Append a message to the global log, capping at MAX_LOG_SIZE. */
function appendToLog(message: AgentMessage): void {
  messageLog.push(message);
  if (messageLog.length > MAX_LOG_SIZE) {
    messageLog.splice(0, messageLog.length - MAX_LOG_SIZE);
  }
}

/** Deliver a message to a specific agent inbox. */
function deliverMessage(message: AgentMessage, targetAgent: string): boolean {
  if (!agentInboxes.has(targetAgent)) {
    return false;
  }
  message.status = "delivered";
  insertIntoInbox(targetAgent, message);
  return true;
}

// ---------------------------------------------------------------------------
// GET handler — message bus stats
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const totalMessages = messageLog.length;

    const activeChannels: string[] = [];
    for (const [agentId, inbox] of agentInboxes.entries()) {
      if (inbox.length > 0) {
        activeChannels.push(agentId);
      }
    }

    const recentMessages = messageLog
      .slice(-20)
      .reverse();

    const agentInboxCounts: Record<string, number> = {};
    for (const [agentId, inbox] of agentInboxes.entries()) {
      agentInboxCounts[agentId] = inbox.length;
    }

    const stats: MessageBusStats = {
      totalMessages,
      activeChannels,
      recentMessages,
      agentInboxes: agentInboxCounts,
      deadLetterCount: deadLetterQueue.length,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to retrieve message bus stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — send a message
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: SendMessageRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // ── Validate required fields ──────────────────────────────────────────

  if (!body.from || typeof body.from !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'from' — must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!body.to || typeof body.to !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'to' — must be a non-empty string or 'all'" },
      { status: 400 },
    );
  }

  const validTypes: MessageType[] = ["task", "result", "query", "broadcast", "error"];
  if (!body.type || !validTypes.includes(body.type)) {
    return NextResponse.json(
      { success: false, error: `Missing or invalid 'type' — must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  if (!body.subject || typeof body.subject !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'subject' — must be a non-empty string" },
      { status: 400 },
    );
  }

  const priority: MessagePriority = body.priority ?? "medium";
  const validPriorities: MessagePriority[] = ["low", "medium", "high", "critical"];
  if (!validPriorities.includes(priority)) {
    return NextResponse.json(
      { success: false, error: `Invalid 'priority' — must be one of: ${validPriorities.join(", ")}` },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = body.payload ?? {};

  // ── Construct message ─────────────────────────────────────────────────

  const baseMessage: Omit<AgentMessage, "id"> = {
    from: body.from,
    to: body.to,
    type: body.type,
    subject: body.subject,
    payload,
    priority,
    timestamp: Date.now(),
    status: "pending",
    retries: 0,
  };

  // ── Broadcast ─────────────────────────────────────────────────────────

  if (body.to === "all") {
    const deliveredTo: string[] = [];
    const failedTo: string[] = [];

    for (const agent of KNOWN_AGENTS) {
      // Don't send to self
      if (agent === body.from) continue;

      const msg: AgentMessage = { ...baseMessage, id: generateId(), to: agent };
      const delivered = deliverMessage(msg, agent);

      if (delivered) {
        deliveredTo.push(agent);
        appendToLog(msg);
      } else {
        msg.status = "failed";
        failedTo.push(agent);
        deadLetterQueue.push({
          message: msg,
          reason: `Unknown agent inbox: ${agent}`,
          failedAt: Date.now(),
        });
        appendToLog(msg);
      }
    }

    return NextResponse.json({
      success: true,
      broadcast: true,
      deliveredTo,
      failedTo,
      messageId: `broadcast-${Date.now()}`,
    });
  }

  // ── Direct message ────────────────────────────────────────────────────

  const message: AgentMessage = { ...baseMessage, id: generateId() };

  const delivered = deliverMessage(message, body.to);
  appendToLog(message);

  if (!delivered) {
    message.status = "failed";
    deadLetterQueue.push({
      message,
      reason: `Agent '${body.to}' does not have an inbox. Known agents: ${KNOWN_AGENTS.join(", ")}`,
      failedAt: Date.now(),
    });

    return NextResponse.json(
      {
        success: false,
        error: `Failed to deliver message — agent '${body.to}' does not have an inbox`,
        messageId: message.id,
        deadLettered: true,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message,
  });
}
