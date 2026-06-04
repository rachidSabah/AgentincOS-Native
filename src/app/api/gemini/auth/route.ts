import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  getGeminiAuthStatusAsync,
  findGeminiBinaryAsync,
  GEMINI_DATA_DIR,
  GEMINI_AUTH_PATH,
  GEMINI_CONFIG_PATH,
} from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthRequest {
  action: "login" | "logout" | "status";
  apiKey?: string;
}

// ---------------------------------------------------------------------------
// GET handler — Quick auth status check
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const authStatus = await getGeminiAuthStatusAsync();
    return NextResponse.json(authStatus);
  } catch (error) {
    console.error("[gemini/auth] Status check failed:", error);
    return NextResponse.json(
      {
        authenticated: false,
        method: "none",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — Authenticate Gemini CLI
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: AuthRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["login", "logout", "status"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid 'action' field. Must be 'login', 'logout', or 'status'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "login":
      return handleLogin(body.apiKey);
    case "logout":
      return handleLogout();
    case "status":
      return handleStatus();
    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// Login Handler
// ---------------------------------------------------------------------------

async function handleLogin(apiKey?: string): Promise<NextResponse> {
  // If an API key is provided, save it
  if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
    try {
      // Ensure the Gemini data directory exists
      if (!existsSync(GEMINI_DATA_DIR)) {
        mkdirSync(GEMINI_DATA_DIR, { recursive: true });
      }

      // Save the API key to the Gemini config
      const configPath = GEMINI_CONFIG_PATH;
      let config: Record<string, unknown> = {};

      if (existsSync(configPath)) {
        try {
          const raw = readFileSync(configPath, "utf-8");
          config = JSON.parse(raw);
        } catch {
          config = {};
        }
      }

      config.api_key = apiKey.trim();

      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

      // Also set it as an environment variable reference
      const envPath = join(GEMINI_DATA_DIR, ".env");
      writeFileSync(envPath, `GEMINI_API_KEY=${apiKey.trim()}\n`, "utf-8");

      return NextResponse.json({
        authenticated: true,
        method: "api_key",
        message: "API key saved successfully. Gemini CLI will use this key for authentication.",
        apiKeySet: true,
        oauthConnected: false,
      });
    } catch (error) {
      console.error("[gemini/auth] Failed to save API key:", error);
      return NextResponse.json(
        {
          authenticated: false,
          method: "none",
          error: "Failed to save API key: " + (error instanceof Error ? error.message : "Unknown error"),
        },
        { status: 500 },
      );
    }
  }

  // If no API key provided, try OAuth flow or check if Gemini CLI can handle it
  const binPath = await findGeminiBinaryAsync();

  if (!binPath) {
    return NextResponse.json(
      {
        authenticated: false,
        method: "none",
        error: "Gemini CLI is not installed. Please install it first, or provide an API key.",
        installHint: "Install with: npm install -g @google/gemini-cli",
      },
      { status: 400 },
    );
  }

  // For OAuth, we'd need to start the Gemini CLI's auth flow
  // Since this is a server-side API, we can't directly handle the interactive OAuth flow
  // Instead, we provide instructions
  return NextResponse.json({
    authenticated: false,
    method: "none",
    message:
      "No API key provided. For OAuth-based authentication, please run 'gemini auth login' in your terminal, or provide an API key via the apiKey field.",
    cliAvailable: true,
    cliPath: binPath,
    oauthHint: "Run in terminal: gemini auth login",
    apiKeyHint: "Or provide your API key in the request body: { action: 'login', apiKey: 'your-key' }",
  });
}

// ---------------------------------------------------------------------------
// Logout Handler
// ---------------------------------------------------------------------------

async function handleLogout(): Promise<NextResponse> {
  try {
    let removed = false;

    // Remove API key from config
    if (existsSync(GEMINI_CONFIG_PATH)) {
      try {
        const raw = readFileSync(GEMINI_CONFIG_PATH, "utf-8");
        const config = JSON.parse(raw);
        if (config.api_key) {
          delete config.api_key;
          writeFileSync(GEMINI_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
          removed = true;
        }
      } catch {
        // Config file not readable — continue
      }
    }

    // Remove auth tokens
    if (existsSync(GEMINI_AUTH_PATH)) {
      try {
        const raw = readFileSync(GEMINI_AUTH_PATH, "utf-8");
        const authData = JSON.parse(raw);
        if (authData.access_token || authData.refresh_token) {
          writeFileSync(GEMINI_AUTH_PATH, JSON.stringify({}, null, 2), "utf-8");
          removed = true;
        }
      } catch {
        // Auth file not readable — continue
      }
    }

    // Remove .env file with API key
    const envPath = join(GEMINI_DATA_DIR, ".env");
    if (existsSync(envPath)) {
      try {
        writeFileSync(envPath, "", "utf-8");
        removed = true;
      } catch {
        // Could not clear env file
      }
    }

    return NextResponse.json({
      authenticated: false,
      method: "none",
      message: removed
        ? "Successfully logged out. API key and auth tokens removed."
        : "No active authentication found to remove.",
      apiKeySet: false,
      oauthConnected: false,
    });
  } catch (error) {
    console.error("[gemini/auth] Logout failed:", error);
    return NextResponse.json(
      {
        authenticated: false,
        method: "none",
        error: "Failed to log out: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Status Handler
// ---------------------------------------------------------------------------

async function handleStatus(): Promise<NextResponse> {
  try {
    const authStatus = await getGeminiAuthStatusAsync();
    return NextResponse.json(authStatus);
  } catch (error) {
    console.error("[gemini/auth] Status check failed:", error);
    return NextResponse.json(
      {
        authenticated: false,
        method: "none",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
