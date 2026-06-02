import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  headers: Record<string, string>;
  active: boolean;
  createdAt: number;
  lastDelivery?: {
    timestamp: number;
    status: number;
    duration: number;
  };
  deliveryCount: number;
  failureCount: number;
}

interface Delivery {
  id: string;
  webhookId: string;
  event: string;
  timestamp: number;
  status: number;
  duration: number;
  success: boolean;
  payload: string;
  response?: string;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const webhooks = new Map<string, Webhook>();
const deliveries = new Map<string, Delivery[]>();
const rateLimits = new Map<string, RateLimitEntry>();

const AVAILABLE_EVENTS = [
  "agent.message",
  "task.complete",
  "task.failed",
  "cost.alert",
  "swarm.decision",
  "workflow.complete",
  "system.alert",
] as const;

const MAX_DELIVERIES_PER_HOUR = 100;
const MAX_DELIVERIES_STORED = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function validateEvents(events: string[]): string[] {
  const valid = new Set<string>(AVAILABLE_EVENTS);
  return events.filter((e) => valid.has(e));
}

const BLOCKED_HOSTS = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
] as const;

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function isRateLimited(webhookId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(webhookId);

  if (!entry || now - entry.windowStart > 3600_000) {
    rateLimits.set(webhookId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_DELIVERIES_PER_HOUR) {
    return true;
  }

  entry.count++;
  return false;
}

function pruneDeliveries(webhookId: string): void {
  const list = deliveries.get(webhookId);
  if (list && list.length > MAX_DELIVERIES_STORED) {
    deliveries.set(webhookId, list.slice(-MAX_DELIVERIES_STORED));
  }
}

// ---------------------------------------------------------------------------
// GET — Return all registered webhooks with status and recent deliveries
// ---------------------------------------------------------------------------

export async function GET() {
  const webhookList = Array.from(webhooks.values()).map((wh) => {
    const recentDeliveries = deliveries.get(wh.id)?.slice(-5) ?? [];
    return {
      ...wh,
      recentDeliveries,
      rateLimitRemaining:
        MAX_DELIVERIES_PER_HOUR -
        (rateLimits.get(wh.id)?.count ?? 0),
    };
  });

  return NextResponse.json({
    webhooks: webhookList,
    availableEvents: AVAILABLE_EVENTS,
    total: webhookList.length,
    active: webhookList.filter((w) => w.active).length,
  });
}

// ---------------------------------------------------------------------------
// POST — Manage webhooks
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = body.action as string | undefined;

  if (!action) {
    return NextResponse.json(
      { error: "Missing 'action' field" },
      { status: 400 },
    );
  }

  switch (action) {
    case "register":
      return handleRegister(body);
    case "update":
      return handleUpdate(body);
    case "delete":
      return handleDelete(body);
    case "test":
      return handleTest(body);
    case "deliveries":
      return handleDeliveries(body);
    default:
      return NextResponse.json(
        {
          error: `Unknown action '${action}'. Valid: register, update, delete, test, deliveries`,
        },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// register — Register a new webhook
// ---------------------------------------------------------------------------

function handleRegister(
  body: Record<string, unknown>,
): NextResponse {
  const { name, url, events, secret, headers } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'name'" },
      { status: 400 },
    );
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'url'" },
      { status: 400 },
    );
  }

  if (!isValidWebhookUrl(url)) {
    return NextResponse.json(
      { error: "Invalid or internal URL — must be a valid external URL" },
      { status: 400 },
    );
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'events' array" },
      { status: 400 },
    );
  }

  if (!secret || typeof secret !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'secret'" },
      { status: 400 },
    );
  }

  const validEvents = validateEvents(events as string[]);
  if (validEvents.length === 0) {
    return NextResponse.json(
      { error: "No valid events provided", availableEvents: AVAILABLE_EVENTS },
      { status: 400 },
    );
  }

  const id = generateId();

  const webhook: Webhook = {
    id,
    name,
    url,
    events: validEvents,
    secret,
    headers: (headers as Record<string, string>) ?? {},
    active: true,
    createdAt: Date.now(),
    deliveryCount: 0,
    failureCount: 0,
  };

  webhooks.set(id, webhook);
  deliveries.set(id, []);

  return NextResponse.json(
    {
      success: true,
      webhook,
      message: `Webhook '${name}' registered with ${validEvents.length} event(s)`,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// update — Update an existing webhook
// ---------------------------------------------------------------------------

function handleUpdate(
  body: Record<string, unknown>,
): NextResponse {
  const { id, url, events, active } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  const webhook = webhooks.get(id);
  if (!webhook) {
    return NextResponse.json(
      { error: `Webhook '${id}' not found` },
      { status: 404 },
    );
  }

  if (url !== undefined && typeof url === "string") {
    if (!isValidWebhookUrl(url)) {
      return NextResponse.json(
        { error: "Invalid or internal URL — must be a valid external URL" },
        { status: 400 },
      );
    }
    webhook.url = url;
  }

  if (Array.isArray(events)) {
    const validEvents = validateEvents(events);
    if (validEvents.length === 0) {
      return NextResponse.json(
        {
          error: "No valid events provided",
          availableEvents: AVAILABLE_EVENTS,
        },
        { status: 400 },
      );
    }
    webhook.events = validEvents;
  }

  if (active !== undefined && typeof active === "boolean") {
    webhook.active = active;
  }

  webhooks.set(id, webhook);

  return NextResponse.json({
    success: true,
    webhook,
    message: `Webhook '${webhook.name}' updated`,
  });
}

// ---------------------------------------------------------------------------
// delete — Delete a webhook
// ---------------------------------------------------------------------------

function handleDelete(
  body: Record<string, unknown>,
): NextResponse {
  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  const webhook = webhooks.get(id);
  if (!webhook) {
    return NextResponse.json(
      { error: `Webhook '${id}' not found` },
      { status: 404 },
    );
  }

  webhooks.delete(id);
  deliveries.delete(id);
  rateLimits.delete(id);

  return NextResponse.json({
    success: true,
    message: `Webhook '${webhook.name}' deleted`,
  });
}

// ---------------------------------------------------------------------------
// test — Send a test payload to the webhook URL
// ---------------------------------------------------------------------------

async function handleTest(
  body: Record<string, unknown>,
): NextResponse {
  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  const webhook = webhooks.get(id);
  if (!webhook) {
    return NextResponse.json(
      { error: `Webhook '${id}' not found` },
      { status: 404 },
    );
  }

  if (isRateLimited(id)) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Webhook has reached the maximum of ${MAX_DELIVERIES_PER_HOUR} deliveries per hour`,
      },
      { status: 429 },
    );
  }

  const testPayload = {
    event: "test",
    timestamp: Date.now(),
    data: {
      message: "This is a test delivery from Hermes Webhook Gateway",
      webhookId: id,
      webhookName: webhook.name,
    },
  };

  const start = Date.now();
  let status = 0;
  let success = false;
  let responseBody = "";

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": `sha256=${testPayload.timestamp}`,
      "X-Webhook-Event": "test",
      "X-Webhook-ID": id,
      ...webhook.headers,
    };

    const res = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10_000),
    });

    status = res.status;
    success = res.status >= 200 && res.status < 300;

    try {
      responseBody = await res.text();
      if (responseBody.length > 500) {
        responseBody = responseBody.slice(0, 500) + "...[truncated]";
      }
    } catch {
      responseBody = "[could not read response]";
    }
  } catch (err) {
    status = 0;
    success = false;
    responseBody =
      err instanceof Error ? err.message : "Unknown error";
  }

  const duration = Date.now() - start;

  const delivery: Delivery = {
    id: `dlv_${Date.now().toString(36)}`,
    webhookId: id,
    event: "test",
    timestamp: Date.now(),
    status,
    duration,
    success,
    payload: JSON.stringify(testPayload),
    response: responseBody,
  };

  const list = deliveries.get(id) ?? [];
  list.push(delivery);
  deliveries.set(id, list);
  pruneDeliveries(id);

  webhook.deliveryCount++;
  if (!success) webhook.failureCount++;
  webhook.lastDelivery = {
    timestamp: delivery.timestamp,
    status: delivery.status,
    duration: delivery.duration,
  };

  return NextResponse.json({
    success,
    delivery,
    message: success
      ? `Test delivery succeeded (HTTP ${status}, ${duration}ms)`
      : `Test delivery failed (HTTP ${status ?? "no response"}, ${duration}ms)`,
  });
}

// ---------------------------------------------------------------------------
// deliveries — Return recent delivery attempts for a webhook
// ---------------------------------------------------------------------------

function handleDeliveries(
  body: Record<string, unknown>,
): NextResponse {
  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  const webhook = webhooks.get(id);
  if (!webhook) {
    return NextResponse.json(
      { error: `Webhook '${id}' not found` },
      { status: 404 },
    );
  }

  const list = deliveries.get(id) ?? [];

  return NextResponse.json({
    webhookId: id,
    webhookName: webhook.name,
    deliveries: list,
    total: list.length,
    successRate:
      webhook.deliveryCount > 0
        ? ((webhook.deliveryCount - webhook.failureCount) /
            webhook.deliveryCount) *
          100
        : 100,
    rateLimitRemaining:
      MAX_DELIVERIES_PER_HOUR -
      (rateLimits.get(id)?.count ?? 0),
  });
}
