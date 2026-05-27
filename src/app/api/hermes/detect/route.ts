import { NextResponse } from "next/server";
import { existsSync } from "fs";
import {
  isHermesInstalled,
  isHermesRunning,
  getHermesApiEndpoint,
  getHermesVersion,
  getHermesModel,
  HERMES_CONFIG_PATH,
} from "@/lib/hermes";

export interface DetectResponse {
  installed: boolean;
  running: boolean;
  version?: string;
  apiEndpoint?: string;
  configPath?: string;
  model?: string;
}

export async function GET() {
  try {
    const installed = isHermesInstalled();
    const configExists = existsSync(HERMES_CONFIG_PATH);
    const apiEndpoint = getHermesApiEndpoint();

    let running = false;
    if (installed || configExists) {
      running = await isHermesRunning(apiEndpoint);
    }

    const version = installed ? getHermesVersion() : undefined;
    const model = running ? getHermesModel() : undefined;

    const result: DetectResponse = {
      installed,
      running,
      ...(version && { version }),
      ...(running && { apiEndpoint }),
      ...(configExists && { configPath: HERMES_CONFIG_PATH }),
      ...(model && { model }),
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
