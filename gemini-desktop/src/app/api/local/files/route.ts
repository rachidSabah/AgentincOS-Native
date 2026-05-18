import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, targetPath, content } = body;

    const desktopPath = path.join(os.homedir(), "Desktop");
    let resolvedPath = targetPath ? path.resolve(targetPath) : desktopPath;

    if (action === "list") {
      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json({ error: "Path does not exist" }, { status: 404 });
      }
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
      }

      const files = fs.readdirSync(resolvedPath).map((name) => {
        const filePath = path.join(resolvedPath, name);
        try {
          const fileStats = fs.statSync(filePath);
          return {
            name,
            path: filePath,
            isDirectory: fileStats.isDirectory(),
            size: fileStats.size,
            updatedAt: fileStats.mtime,
          };
        } catch {
          return {
            name,
            path: filePath,
            isDirectory: false,
            size: 0,
            updatedAt: new Date(),
          };
        }
      });

      return NextResponse.json({ files, currentPath: resolvedPath });
    }

    if (action === "read") {
      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        return NextResponse.json({ error: "Path is not a file" }, { status: 400 });
      }
      const data = fs.readFileSync(resolvedPath, "utf-8");
      return NextResponse.json({ content: data, path: resolvedPath });
    }

    if (action === "write") {
      if (!targetPath) {
        return NextResponse.json({ error: "Path is required to write file" }, { status: 400 });
      }
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, content || "", "utf-8");
      return NextResponse.json({ success: true, path: resolvedPath });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
