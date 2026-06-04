import { NextResponse } from "next/server";
import { existsSync } from "fs";
import {
  isHermesInstalledAsync,
  isHermesRunning,
  getHermesApiEndpointCached,
  getHermesVersionAsync,
  getHermesModelAsync,
  measureHermesLatency,
  HERMES_CONFIG_PATH,
} from "@/lib/hermes";

export interface DetectResponse {
  installed: boolean;
  running: boolean;
  version?: string;
  apiEndpoint?: string;
  configPath?: string;
  model?: string;
  latency?: number;
}

export async function GET() {
  const startTime = Date.now();

  try {
    const installed = await isHermesInstalledAsync();
    const configExists = existsSync(HERMES_CONFIG_PATH);
    const apiEndpoint = getHermesApiEndpointCached();

    let running = false;
    if (installed || configExists) {
      running = await isHermesRunning(apiEndpoint);
    }

    const [version, model, latency] = await Promise.all([
      installed ? getHermesVersionAsync() : Promise.resolve(undefined),
      running ? getHermesModelAsync() : Promise.resolve(undefined),
      running ? measureHermesLatency(apiEndpoint) : Promise.resolve(undefined),
    ]);

    const detectLatency = Date.now() - startTime;

    const result: DetectResponse = {
      installed,
      running,
      ...(version && { version }),
      ...(running && { apiEndpoint }),
      ...(configExists && { configPath: HERMES_CONFIG_PATH }),
      ...(model && { model }),
      ...(latency !== undefined && { latency }),
      latency: detectLatency,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        installed: false,
        running: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
