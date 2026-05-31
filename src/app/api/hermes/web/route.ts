import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import {
  getHermesConfig,
  getHermesApiEndpointCached,
  isHermesRunning,
  hermesFetchQueued,
  HERMES_ENV_PATH,
} from "@/lib/hermes";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

/** All supported web search backends. */
const WEB_BACKENDS = ["firecrawl", "parallel", "tavily", "exa"] as const;
type WebBackend = (typeof WEB_BACKENDS)[number];

/** Environment variable names that indicate a backend has an API key set. */
const BACKEND_ENV_KEYS: Record<WebBackend, string[]> = {
  firecrawl: ["FIRECRAWL_API_KEY"],
  parallel: ["PARALLEL_API_KEY"],
  tavily: ["TAVILY_API_KEY"],
  exa: ["EXA_API_KEY"],
};

interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
}

interface WebExtractResult {
  title?: string;
  content: string;
  url: string;
  metadata?: Record<string, unknown>;
}

interface WebCrawlPage {
  url: string;
  title: string;
  content: string;
}

interface WebConfigResponse {
  backend: string;
  available: string[];
}

interface SearchRequest {
  action: "search";
  query: string;
  num?: number;
  backend?: string;
}

interface ExtractRequest {
  action: "extract";
  url: string;
  backend?: string;
}

interface CrawlRequest {
  action: "crawl";
  url: string;
  maxPages?: number;
  backend?: string;
}

type WebRequestBody = SearchRequest | ExtractRequest | CrawlRequest;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the Hermes .env file and returns a Set of defined variable names.
 */
function getHermesEnvVars(): Set<string> {
  const vars = new Set<string>();

  if (!existsSync(HERMES_ENV_PATH)) return vars;

  try {
    const raw = readFileSync(HERMES_ENV_PATH, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && val && val !== '""' && val !== "''") {
        vars.add(key);
      }
    }
  } catch {
    // ignore read errors
  }

  return vars;
}

/**
 * Determines which web backends have API keys configured.
 */
function getAvailableBackends(): string[] {
  const envVars = getHermesEnvVars();
  const available: string[] = [];

  for (const backend of WEB_BACKENDS) {
    const keys = BACKEND_ENV_KEYS[backend];
    if (keys.some((key) => envVars.has(key) || !!process.env[key])) {
      available.push(backend);
    }
  }

  return available;
}

/**
 * Attempts to fetch the web config from the Hermes API at `/v1/web/config`.
 * Returns `null` if the endpoint is unavailable.
 */
async function fetchWebConfigFromApi(): Promise<WebConfigResponse | null> {
  try {
    const res = await hermesFetchQueued("/v1/web/config");
    if (res.ok) {
      const data = await res.json();
      return {
        backend: data.backend ?? "firecrawl",
        available: data.available ?? getAvailableBackends(),
      };
    }
  } catch {
    // API not available — fall through
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fallback: Chat-based tool calls
// ---------------------------------------------------------------------------

/**
 * Sends a chat completion request to Hermes with a tool call instruction,
 * used as a fallback when dedicated web API endpoints are unavailable.
 */
async function chatToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<unknown> {
  const payload = {
    model: "default",
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "You are a web operations assistant. Use the provided tool to fulfill the user's request. Return raw results without extra commentary.",
      },
      {
        role: "user",
        content: JSON.stringify({ tool: toolName, arguments: toolArgs }),
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: toolName,
          description: `Execute ${toolName}`,
          parameters: {
            type: "object",
            properties: Object.fromEntries(
              Object.keys(toolArgs).map((key) => [key, { type: "string" }]),
            ),
            required: Object.keys(toolArgs),
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: toolName } },
  };

  const res = await hermesFetchQueued("/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(
      `Hermes chat API returned ${res.status}: ${errorText}`,
    );
  }

  const data = await res.json();

  // Extract tool call result from the chat completion response
  const choice = data.choices?.[0];
  const toolCall = choice?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      return { raw: toolCall.function.arguments };
    }
  }

  // Some models return the result in the message content instead
  if (choice?.message?.content) {
    try {
      return JSON.parse(choice.message.content);
    } catch {
      return { content: choice.message.content };
    }
  }

  throw new Error("No tool call result in Hermes chat response");
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSearch(
  body: SearchRequest,
): Promise<NextResponse> {
  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'query' field" },
      { status: 400 },
    );
  }

  const searchParams: Record<string, unknown> = {
    query: body.query,
  };
  if (body.num) searchParams.num = body.num;
  if (body.backend) searchParams.backend = body.backend;

  // Try the dedicated web search API first
  try {
    const res = await hermesFetchQueued("/v1/web/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchParams),
    });

    if (res.ok) {
      const data = await res.json();
      // Normalize the response
      const results: WebSearchResult[] = Array.isArray(data.results)
        ? data.results.map(
            (r: Record<string, unknown>) => ({
              url: String(r.url ?? ""),
              title: String(r.title ?? ""),
              snippet: String(r.snippet ?? r.content ?? ""),
            }),
          )
        : [];
      return NextResponse.json({ results });
    }
  } catch {
    // Dedicated API unavailable — fall through to chat fallback
  }

  // Fallback: use Hermes chat with tool call
  try {
    const raw = await chatToolCall("web_search", searchParams);
    const results: WebSearchResult[] = Array.isArray(raw)
      ? raw.map(
          (r: Record<string, unknown>) => ({
            url: String(r.url ?? ""),
            title: String(r.title ?? ""),
            snippet: String(r.snippet ?? r.content ?? ""),
          }),
        )
      : [];

    // If the fallback returned an object with a results array, unwrap it
    if (!Array.isArray(raw) && typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.results)) {
        return NextResponse.json({
          results: obj.results.map(
            (r: Record<string, unknown>) => ({
              url: String(r.url ?? ""),
              title: String(r.title ?? ""),
              snippet: String(r.snippet ?? r.content ?? ""),
            }),
          ),
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Web search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

async function handleExtract(
  body: ExtractRequest,
): Promise<NextResponse> {
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'url' field" },
      { status: 400 },
    );
  }

  const extractParams: Record<string, unknown> = {
    url: body.url,
  };
  if (body.backend) extractParams.backend = body.backend;

  // Try the dedicated web extract API first
  try {
    const res = await hermesFetchQueued("/v1/web/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extractParams),
    });

    if (res.ok) {
      const data = await res.json();
      const result: WebExtractResult = {
        title: data.title ?? undefined,
        content: String(data.content ?? ""),
        url: String(data.url ?? body.url),
        ...(data.metadata && { metadata: data.metadata }),
      };
      return NextResponse.json(result);
    }
  } catch {
    // Dedicated API unavailable — fall through to chat fallback
  }

  // Fallback: use Hermes chat with tool call
  try {
    const raw = await chatToolCall("web_extract", extractParams);
    const result: WebExtractResult = {
      title:
        (raw as Record<string, unknown>)?.title !== undefined
          ? String((raw as Record<string, unknown>).title)
          : undefined,
      content: String(
        (raw as Record<string, unknown>)?.content ??
          (raw as Record<string, unknown>)?.text ??
          "",
      ),
      url: String(
        (raw as Record<string, unknown>)?.url ?? body.url,
      ),
      metadata:
        (raw as Record<string, unknown>)?.metadata !== undefined
          ? (raw as Record<string, unknown>).metadata as Record<string, unknown>
          : undefined,
    };
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Web extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

async function handleCrawl(
  body: CrawlRequest,
): Promise<NextResponse> {
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'url' field" },
      { status: 400 },
    );
  }

  const crawlParams: Record<string, unknown> = {
    url: body.url,
  };
  if (body.maxPages) crawlParams.maxPages = body.maxPages;
  if (body.backend) crawlParams.backend = body.backend;

  // Try the dedicated web crawl API first
  try {
    const res = await hermesFetchQueued("/v1/web/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(crawlParams),
    });

    if (res.ok) {
      const data = await res.json();
      const pages: WebCrawlPage[] = Array.isArray(data.pages)
        ? data.pages.map(
            (p: Record<string, unknown>) => ({
              url: String(p.url ?? ""),
              title: String(p.title ?? ""),
              content: String(p.content ?? ""),
            }),
          )
        : [];
      return NextResponse.json({ pages });
    }
  } catch {
    // Dedicated API unavailable — fall through to chat fallback
  }

  // Fallback: use Hermes chat with tool call
  try {
    const raw = await chatToolCall("web_crawl", crawlParams);
    const pages: WebCrawlPage[] = [];

    if (Array.isArray(raw)) {
      for (const p of raw) {
        pages.push({
          url: String((p as Record<string, unknown>).url ?? ""),
          title: String((p as Record<string, unknown>).title ?? ""),
          content: String((p as Record<string, unknown>).content ?? ""),
        });
      }
    } else if (typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.pages)) {
        for (const p of obj.pages) {
          pages.push({
            url: String((p as Record<string, unknown>).url ?? ""),
            title: String((p as Record<string, unknown>).title ?? ""),
            content: String((p as Record<string, unknown>).content ?? ""),
          });
        }
      } else if (obj.url) {
        // Single page result
        pages.push({
          url: String(obj.url),
          title: String(obj.title ?? ""),
          content: String(obj.content ?? ""),
        });
      }
    }

    return NextResponse.json({ pages });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Web crawl failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler — Web search configuration
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const apiEndpoint = getHermesApiEndpointCached();
    const running = await isHermesRunning(apiEndpoint);

    // Try the dedicated /v1/web/config endpoint first
    if (running) {
      const apiConfig = await fetchWebConfigFromApi();
      if (apiConfig) {
        return NextResponse.json(apiConfig);
      }
    }

    // Fallback: parse config file locally
    const config = getHermesConfig();
    const backend = config?.web?.backend ?? "firecrawl";
    const available = getAvailableBackends();

    const result: WebConfigResponse = {
      backend,
      available,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read web search configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — Web search / extract / crawl actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: WebRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'action' field. Must be 'search', 'extract', or 'crawl'" },
      { status: 400 },
    );
  }

  // Verify Hermes is running
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (!running) {
    return NextResponse.json(
      {
        error: "Hermes API server is not running",
        hint: "Start Hermes with 'hermes gateway' or check your configuration",
      },
      { status: 503 },
    );
  }

  switch (body.action) {
    case "search":
      return handleSearch(body as SearchRequest);
    case "extract":
      return handleExtract(body as ExtractRequest);
    case "crawl":
      return handleCrawl(body as CrawlRequest);
    default:
      return NextResponse.json(
        {
          error: `Unknown action '${body.action}'. Must be 'search', 'extract', or 'crawl'`,
        },
        { status: 400 },
      );
  }
}
