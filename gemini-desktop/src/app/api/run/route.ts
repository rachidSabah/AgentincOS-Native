import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const tmpDir = mkdtempSync(join(tmpdir(), "gemini-run-"));
    let output = "";
    let error: string | undefined;

    try {
      if (language === "javascript" || language === "typescript") {
        const ext = language === "typescript" ? "ts" : "js";
        const filePath = join(tmpDir, `script.${ext}`);
        writeFileSync(filePath, code, "utf-8");

        output = execSync(`node "${filePath}"`, {
          timeout: 10000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
          cwd: tmpDir,
        });
      } else if (language === "python") {
        const filePath = join(tmpDir, "script.py");
        writeFileSync(filePath, code, "utf-8");

        let pythonCmd = "python3";
        try {
          execSync("python3 --version", { stdio: "ignore" });
        } catch {
          pythonCmd = "python";
        }

        output = execSync(`${pythonCmd} "${filePath}"`, {
          timeout: 10000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
          cwd: tmpDir,
        });
      } else {
        return NextResponse.json(
          { error: `Unsupported language: ${language}` },
          { status: 400 }
        );
      }
    } catch (execError: any) {
      output = execError.stdout || "";
      error = execError.stderr || execError.message || "Execution failed";
      if (execError.killed || execError.signal === "SIGTERM") {
        error = "Execution timed out (10 second limit)";
      }
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      output: output.trim(),
      error,
      executionTime,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
