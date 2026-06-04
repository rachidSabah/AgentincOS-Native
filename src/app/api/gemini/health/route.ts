import { NextResponse } from "next/server";
import {
  performGeminiHealthCheck,
  getCachedGeminiHealth,
  setCachedGeminiHealth,
  isGeminiInstalledAsync,
  isGeminiProcessRunningAsync,
  findGeminiBinaryAsync,
  getGeminiVersionAsync,
} from "@/lib/gemini";

// ---------------------------------------------------------------------------
// GET handler — Health check for Gemini CLI
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Use cached health check if available
    const cached = getCachedGeminiHealth();
    if (cached) {
      return NextResponse.json(cached);
    }

    // Perform comprehensive health check
    const healthCheck = await performGeminiHealthCheck();
    setCachedGeminiHealth(healthCheck);

    return NextResponse.json(healthCheck);
  } catch (error) {
    console.error("[gemini/health] Health check failed:", error);

    // Try to provide at least basic information even on error
    try {
      const installed = await isGeminiInstalledAsync();
      return NextResponse.json({
        healthy: false,
        latency: -1,
        lastCheck: Date.now(),
        details: `Health check encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        cliInstalled: installed,
        cliResponsive: false,
        apiConnection: false,
      });
    } catch {
      return NextResponse.json(
        {
          healthy: false,
          latency: -1,
          lastCheck: Date.now(),
          details: "Health check failed completely. Unable to determine Gemini CLI status.",
          cliInstalled: false,
          cliResponsive: false,
          apiConnection: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }
}
