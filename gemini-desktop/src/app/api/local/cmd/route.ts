import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { command, cwd } = await req.json();
    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const desktopPath = path.join(os.homedir(), "Desktop");
    const workingDir = cwd || desktopPath;

    return new Promise<NextResponse>((resolve) => {
      exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
        resolve(
          NextResponse.json({
            stdout: stdout || "",
            stderr: stderr || "",
            code: error ? error.code : 0,
            success: !error,
          })
        );
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
