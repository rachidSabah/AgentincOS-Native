import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { platform } from "os";
import {
  findGeminiBinaryAsync,
  getGeminiVersionAsync,
  GEMINI_NPM_PACKAGES,
} from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstallRequest {
  method?: "npm" | "npx" | "brew" | "manual";
  packageIndex?: number; // Index into GEMINI_NPM_PACKAGES
  force?: boolean;
}

// ---------------------------------------------------------------------------
// POST handler — Auto-install Gemini CLI
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: InstallRequest = {};

  try {
    body = await request.json();
  } catch {
    // Empty body is OK — use defaults
  }

  const method = body.method || "npm";
  const force = body.force === true;
  const osPlatform = platform();

  // Check if already installed (unless force is true)
  if (!force) {
    const existingBin = await findGeminiBinaryAsync();
    if (existingBin) {
      const version = await getGeminiVersionAsync();
      return NextResponse.json({
        success: true,
        alreadyInstalled: true,
        message: `Gemini CLI is already installed at: ${existingBin}`,
        version,
        path: existingBin,
      });
    }
  }

  // Build install command based on OS and method
  const installStrategies = getInstallStrategies(osPlatform, method, body.packageIndex);

  // Stream the installation progress via SSE
  return streamInstallation(installStrategies, osPlatform);
}

// ---------------------------------------------------------------------------
// Install Strategy Builder
// ---------------------------------------------------------------------------

function getInstallStrategies(
  osPlatform: string,
  method: string,
  packageIndex?: number,
): Array<{ label: string; command: string; args: string[] }> {
  const strategies: Array<{ label: string; command: string; args: string[] }> = [];

  if (method === "npm" || method === "npx") {
    // Try npm packages in priority order
    const packagesToTry =
      packageIndex !== undefined && packageIndex < GEMINI_NPM_PACKAGES.length
        ? [GEMINI_NPM_PACKAGES[packageIndex]!]
        : GEMINI_NPM_PACKAGES;

    for (const pkg of packagesToTry) {
      if (method === "npm") {
        strategies.push({
          label: `npm install -g ${pkg}`,
          command: "npm",
          args: ["install", "-g", pkg],
        });
      } else {
        strategies.push({
          label: `npx -y ${pkg}`,
          command: "npx",
          args: ["-y", pkg],
        });
      }
    }
  } else if (method === "brew" && osPlatform === "darwin") {
    strategies.push({
      label: "brew install gemini-cli",
      command: "brew",
      args: ["install", "gemini-cli"],
    });
  }

  // Always add npm as fallback
  if (method !== "npm" && method !== "npx") {
    for (const pkg of GEMINI_NPM_PACKAGES) {
      strategies.push({
        label: `npm install -g ${pkg}`,
        command: "npm",
        args: ["install", "-g", pkg],
      });
    }
  }

  return strategies;
}

// ---------------------------------------------------------------------------
// Streaming Installation (SSE)
// ---------------------------------------------------------------------------

function streamInstallation(
  strategies: Array<{ label: string; command: string; args: string[] }>,
  osPlatform: string,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Send initial info
      sendSSE("install:start", {
        message: "Starting Gemini CLI installation...",
        platform: osPlatform,
        strategies: strategies.map((s) => s.label),
        timestamp: Date.now(),
      });

      let installed = false;

      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i]!;

        sendSSE("install:attempt", {
          strategy: strategy.label,
          index: i,
          total: strategies.length,
          message: `Attempting: ${strategy.label}`,
          timestamp: Date.now(),
        });

        try {
          const result = await executeInstallCommand(strategy.command, strategy.args);

          if (result.success) {
            sendSSE("install:progress", {
              strategy: strategy.label,
              stdout: result.stdout,
              message: `${strategy.label} completed successfully.`,
              timestamp: Date.now(),
            });

            // Verify installation
            const binPath = await findGeminiBinaryAsync();
            const version = await getGeminiVersionAsync();

            if (binPath) {
              installed = true;
              sendSSE("install:complete", {
                success: true,
                message: `Gemini CLI installed successfully via ${strategy.label}`,
                version: version || "unknown",
                path: binPath,
                timestamp: Date.now(),
              });
              break;
            } else {
              sendSSE("install:progress", {
                strategy: strategy.label,
                message: `Command completed but Gemini CLI binary not found. Trying next strategy...`,
                timestamp: Date.now(),
              });
            }
          } else {
            sendSSE("install:progress", {
              strategy: strategy.label,
              stderr: result.stderr,
              message: `${strategy.label} failed. ${result.stderr?.slice(0, 200) || "Unknown error"}`,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          sendSSE("install:progress", {
            strategy: strategy.label,
            message: `${strategy.label} encountered an error: ${error instanceof Error ? error.message : "Unknown"}`,
            timestamp: Date.now(),
          });
        }
      }

      if (!installed) {
        sendSSE("install:failed", {
          success: false,
          message:
            "Could not install Gemini CLI automatically. Please try manual installation:",
          manualSteps: getManualInstallSteps(osPlatform),
          timestamp: Date.now(),
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Command Execution Helper
// ---------------------------------------------------------------------------

function executeInstallCommand(
  command: string,
  args: string[],
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000, // 2 minutes
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        stdout: "",
        stderr: err.message,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Manual Install Steps
// ---------------------------------------------------------------------------

function getManualInstallSteps(osPlatform: string): string[] {
  const steps: string[] = [];

  if (osPlatform === "darwin" || osPlatform === "linux") {
    steps.push(
      "Option 1: Install via npm",
      "  npm install -g @google/gemini-cli",
      "",
      "Option 2: Install via npx (no global install)",
      "  npx -y @google/gemini-cli",
      "",
      "Option 3: Install via Homebrew (macOS)",
      "  brew install gemini-cli",
      "",
      "After installation, set your API key:",
      "  export GEMINI_API_KEY=your-api-key-here",
    );
  } else if (osPlatform === "win32") {
    steps.push(
      "Option 1: Install via npm",
      "  npm install -g @google/gemini-cli",
      "",
      "Option 2: Install via npx (no global install)",
      "  npx -y @google/gemini-cli",
      "",
      "After installation, set your API key:",
      "  set GEMINI_API_KEY=your-api-key-here",
      "",
      "Or in PowerShell:",
      '  $env:GEMINI_API_KEY = "your-api-key-here"',
    );
  } else {
    steps.push(
      "Install via npm:",
      "  npm install -g @google/gemini-cli",
      "",
      "After installation, set your API key:",
      "  export GEMINI_API_KEY=your-api-key-here",
    );
  }

  return steps;
}
