import { NextRequest, NextResponse } from "next/server";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  renameSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname, basename, extname } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileReadRequest {
  action: "read";
  path: string;
  encoding?: string;
}

interface FileWriteRequest {
  action: "write";
  path: string;
  content: string;
  encoding?: string;
  createDirs?: boolean;
}

interface FileDeleteRequest {
  action: "delete";
  path: string;
}

interface FileMoveRequest {
  action: "move";
  path: string;
  destination: string;
}

interface FileCopyRequest {
  action: "copy";
  path: string;
  destination: string;
}

interface FileMkdirRequest {
  action: "mkdir";
  path: string;
  recursive?: boolean;
}

interface FileSearchRequest {
  action: "search";
  path: string;
  pattern: string;
  maxDepth?: number;
}

type FileRequest =
  | FileReadRequest
  | FileWriteRequest
  | FileDeleteRequest
  | FileMoveRequest
  | FileCopyRequest
  | FileMkdirRequest
  | FileSearchRequest;

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  extension?: string;
}

// ---------------------------------------------------------------------------
// Security: Allowed paths
// ---------------------------------------------------------------------------

const ALLOWED_BASE_PATHS = [
  process.cwd(),
  homedir(),
  "/tmp",
  "/home",
];

function isPathAllowed(targetPath: string): boolean {
  const resolved = resolvePath(targetPath);
  return ALLOWED_BASE_PATHS.some((base) => resolved.startsWith(base));
}

function resolvePath(inputPath: string): string {
  // Handle home directory shorthand
  let resolved = inputPath;
  if (resolved.startsWith("~")) {
    resolved = join(homedir(), resolved.slice(1));
  }

  // Handle relative paths (resolve from CWD)
  if (!resolved.startsWith("/")) {
    resolved = join(process.cwd(), resolved);
  }

  // Normalize path (remove .., ., etc.)
  // Simple normalization without path.resolve to avoid going above allowed dirs
  const parts = resolved.split("/").filter(Boolean);
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      normalized.pop();
    } else if (part !== ".") {
      normalized.push(part);
    }
  }

  return "/" + normalized.join("/");
}

// ---------------------------------------------------------------------------
// GET handler — List files in a directory
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "list";
  const inputPath = searchParams.get("path") || process.cwd();

  const resolvedPath = resolvePath(inputPath);

  // Security check
  if (!isPathAllowed(resolvedPath)) {
    return NextResponse.json(
      {
        error: "Access denied: path is outside allowed directories",
        path: inputPath,
      },
      { status: 403 },
    );
  }

  try {
    switch (action) {
      case "list":
        return handleList(resolvedPath);
      case "read":
        return handleRead(resolvedPath);
      case "search": {
        const pattern = searchParams.get("pattern") || "";
        const maxDepth = parseInt(searchParams.get("maxDepth") || "3", 10);
        return handleSearch(resolvedPath, pattern, maxDepth);
      }
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use 'list', 'read', or 'search'` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[gemini/files] GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: resolvedPath,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — File operations
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: FileRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !body.path) {
    return NextResponse.json(
      { error: "Missing 'action' or 'path' field" },
      { status: 400 },
    );
  }

  const resolvedPath = resolvePath(body.path);

  // Security check
  if (!isPathAllowed(resolvedPath)) {
    return NextResponse.json(
      {
        error: "Access denied: path is outside allowed directories",
        path: body.path,
      },
      { status: 403 },
    );
  }

  try {
    switch (body.action) {
      case "read":
        return handleRead(resolvedPath);

      case "write":
        return handleWrite(resolvedPath, body as FileWriteRequest);

      case "delete":
        return handleDelete(resolvedPath);

      case "move": {
        const moveBody = body as FileMoveRequest;
        if (!moveBody.destination) {
          return NextResponse.json(
            { error: "Missing 'destination' field for move operation" },
            { status: 400 },
          );
        }
        const resolvedDest = resolvePath(moveBody.destination);
        if (!isPathAllowed(resolvedDest)) {
          return NextResponse.json(
            { error: "Access denied: destination path is outside allowed directories" },
            { status: 403 },
          );
        }
        return handleMove(resolvedPath, resolvedDest);
      }

      case "copy": {
        const copyBody = body as FileCopyRequest;
        if (!copyBody.destination) {
          return NextResponse.json(
            { error: "Missing 'destination' field for copy operation" },
            { status: 400 },
          );
        }
        const resolvedDest = resolvePath(copyBody.destination);
        if (!isPathAllowed(resolvedDest)) {
          return NextResponse.json(
            { error: "Access denied: destination path is outside allowed directories" },
            { status: 403 },
          );
        }
        return handleCopy(resolvedPath, resolvedDest);
      }

      case "mkdir":
        return handleMkdir(resolvedPath, body as FileMkdirRequest);

      case "search": {
        const searchBody = body as FileSearchRequest;
        if (!searchBody.pattern) {
          return NextResponse.json(
            { error: "Missing 'pattern' field for search operation" },
            { status: 400 },
          );
        }
        const maxDepth = searchBody.maxDepth || 3;
        return handleSearch(resolvedPath, searchBody.pattern, maxDepth);
      }

      default:
        return NextResponse.json(
          {
            error: `Invalid action: ${body.action}. Use 'read', 'write', 'delete', 'move', 'copy', 'mkdir', or 'search'`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[gemini/files] POST error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: resolvedPath,
        action: body.action,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

function handleList(dirPath: string): NextResponse {
  if (!existsSync(dirPath)) {
    return NextResponse.json(
      { error: "Directory does not exist", path: dirPath },
      { status: 404 },
    );
  }

  if (!statSync(dirPath).isDirectory()) {
    return NextResponse.json(
      { error: "Path is not a directory", path: dirPath },
      { status: 400 },
    );
  }

  try {
    const entries = readdirSync(dirPath);
    const fileEntries: FileEntry[] = entries.map((name) => {
      const fullPath = join(dirPath, name);
      try {
        const stats = statSync(fullPath);
        const isDir = stats.isDirectory();
        return {
          name,
          path: fullPath,
          type: isDir ? "directory" : "file",
          size: stats.size,
          modified: stats.mtimeMs,
          extension: isDir ? undefined : extname(name) || undefined,
        };
      } catch {
        // Permission denied or other stat error
        return {
          name,
          path: fullPath,
          type: "file" as const,
          size: 0,
          modified: 0,
        };
      }
    });

    // Sort: directories first, then files, alphabetically
    fileEntries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      path: dirPath,
      entries: fileEntries,
      totalFiles: fileEntries.filter((e) => e.type === "file").length,
      totalDirs: fileEntries.filter((e) => e.type === "directory").length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read directory: " + (error instanceof Error ? error.message : "Unknown error"),
        path: dirPath,
      },
      { status: 500 },
    );
  }
}

function handleRead(filePath: string): NextResponse {
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "File does not exist", path: filePath },
      { status: 404 },
    );
  }

  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      // If it's a directory, redirect to listing
      return handleList(filePath);
    }

    // Limit file size to 1MB for reading
    if (stats.size > 1024 * 1024) {
      return NextResponse.json(
        {
          error: "File too large to read (>1MB)",
          path: filePath,
          size: stats.size,
        },
        { status: 413 },
      );
    }

    const content = readFileSync(filePath, "utf-8");

    return NextResponse.json({
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtimeMs,
      extension: extname(filePath) || undefined,
      name: basename(filePath),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read file: " + (error instanceof Error ? error.message : "Unknown error"),
        path: filePath,
      },
      { status: 500 },
    );
  }
}

function handleWrite(filePath: string, body: FileWriteRequest): NextResponse {
  try {
    const dir = dirname(filePath);

    // Create directories if needed
    if (body.createDirs !== false && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, body.content, body.encoding || "utf-8");

    return NextResponse.json({
      success: true,
      action: "write",
      path: filePath,
      size: body.content.length,
      message: "File written successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to write file: " + (error instanceof Error ? error.message : "Unknown error"),
        path: filePath,
      },
      { status: 500 },
    );
  }
}

function handleDelete(filePath: string): NextResponse {
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "File does not exist", path: filePath },
      { status: 404 },
    );
  }

  try {
    unlinkSync(filePath);
    return NextResponse.json({
      success: true,
      action: "delete",
      path: filePath,
      message: "File deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete file: " + (error instanceof Error ? error.message : "Unknown error"),
        path: filePath,
      },
      { status: 500 },
    );
  }
}

function handleMove(sourcePath: string, destinationPath: string): NextResponse {
  if (!existsSync(sourcePath)) {
    return NextResponse.json(
      { error: "Source file does not exist", path: sourcePath },
      { status: 404 },
    );
  }

  try {
    // Create destination directory if needed
    const destDir = dirname(destinationPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    renameSync(sourcePath, destinationPath);

    return NextResponse.json({
      success: true,
      action: "move",
      from: sourcePath,
      to: destinationPath,
      message: "File moved successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to move file: " + (error instanceof Error ? error.message : "Unknown error"),
        from: sourcePath,
        to: destinationPath,
      },
      { status: 500 },
    );
  }
}

function handleCopy(sourcePath: string, destinationPath: string): NextResponse {
  if (!existsSync(sourcePath)) {
    return NextResponse.json(
      { error: "Source file does not exist", path: sourcePath },
      { status: 404 },
    );
  }

  try {
    // Create destination directory if needed
    const destDir = dirname(destinationPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    copyFileSync(sourcePath, destinationPath);

    return NextResponse.json({
      success: true,
      action: "copy",
      from: sourcePath,
      to: destinationPath,
      message: "File copied successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to copy file: " + (error instanceof Error ? error.message : "Unknown error"),
        from: sourcePath,
        to: destinationPath,
      },
      { status: 500 },
    );
  }
}

function handleMkdir(dirPath: string, body: FileMkdirRequest): NextResponse {
  try {
    if (existsSync(dirPath)) {
      return NextResponse.json(
        {
          success: true,
          action: "mkdir",
          path: dirPath,
          message: "Directory already exists",
          alreadyExists: true,
        },
      );
    }

    mkdirSync(dirPath, { recursive: body.recursive !== false });

    return NextResponse.json({
      success: true,
      action: "mkdir",
      path: dirPath,
      message: "Directory created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create directory: " + (error instanceof Error ? error.message : "Unknown error"),
        path: dirPath,
      },
      { status: 500 },
    );
  }
}

function handleSearch(
  searchPath: string,
  pattern: string,
  maxDepth: number,
): NextResponse {
  if (!existsSync(searchPath)) {
    return NextResponse.json(
      { error: "Search path does not exist", path: searchPath },
      { status: 404 },
    );
  }

  if (!pattern) {
    return NextResponse.json(
      { error: "Missing search pattern" },
      { status: 400 },
    );
  }

  try {
    const results: FileEntry[] = [];
    const patternLower = pattern.toLowerCase();

    function walkDir(dir: string, currentDepth: number) {
      if (currentDepth > maxDepth) return;

      try {
        const entries = readdirSync(dir);
        for (const name of entries) {
          // Skip hidden files and node_modules
          if (name.startsWith(".") || name === "node_modules") continue;

          const fullPath = join(dir, name);
          try {
            const stats = statSync(fullPath);
            const isDir = stats.isDirectory();

            // Check if name matches pattern
            if (name.toLowerCase().includes(patternLower)) {
              results.push({
                name,
                path: fullPath,
                type: isDir ? "directory" : "file",
                size: stats.size,
                modified: stats.mtimeMs,
                extension: isDir ? undefined : extname(name) || undefined,
              });
            }

            // Recurse into directories
            if (isDir && results.length < 100) {
              walkDir(fullPath, currentDepth + 1);
            }
          } catch {
            // Permission denied — skip
          }
        }
      } catch {
        // Permission denied — skip
      }
    }

    walkDir(searchPath, 0);

    return NextResponse.json({
      path: searchPath,
      pattern,
      maxDepth,
      results,
      totalMatches: results.length,
      truncated: results.length >= 100,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Search failed: " + (error instanceof Error ? error.message : "Unknown error"),
        path: searchPath,
        pattern,
      },
      { status: 500 },
    );
  }
}
