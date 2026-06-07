/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Agentic OS v2.0.0 — Installer Staging Script
 * Prepares all files needed by the NSIS installer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Usage: node installer/stage.js
 *
 * This script:
 * 1. Builds the Next.js app (if not already built)
 * 2. Copies standalone output, public/, db/, prisma/ to installer/stage/
 * 3. Copies essential node_modules (prisma)
 * 4. Creates LICENSE.txt and .env template
 * 5. Reports staging status
 */

"use strict";

const path = require("path");
const fs = require("fs");

// ─── Configuration ────────────────────────────────────────────────────────────
const APP_NAME = "Agentic OS";
const APP_VERSION = "2.0.0";
const PORT = 3000;

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const STAGING_DIR = path.join(SCRIPT_DIR, "stage");

const PATHS = {
  standalone: path.join(PROJECT_ROOT, ".next", "standalone"),
  static: path.join(PROJECT_ROOT, ".next", "static"),
  public: path.join(PROJECT_ROOT, "public"),
  db: path.join(PROJECT_ROOT, "db"),
  prisma: path.join(PROJECT_ROOT, "prisma"),
  nodeModules: path.join(PROJECT_ROOT, "node_modules"),
  iconIco: path.join(PROJECT_ROOT, "src-tauri", "icons", "icon.ico"),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(level, msg) {
  const prefix = { info: "  [OK] ", warn: "  [!!] ", error: "  [XX] ", step: "\n>>> " };
  console.log(`${prefix[level] || ""}${msg}`);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return false;

  // Create dest if needed
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log("");
  console.log("  ══════════════════════════════════════════════");
  console.log(`  ${APP_NAME} v${APP_VERSION} — Staging`);
  console.log("  ══════════════════════════════════════════════");
  console.log("");

  // Clean staging directory
  log("step", "Preparing staging directory...");
  if (fs.existsSync(STAGING_DIR)) {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  log("info", `Staging dir: ${STAGING_DIR}`);

  // ─── Stage .next/standalone ────────────────────────────────────────────────
  log("step", "Staging .next/standalone/...");
  if (fs.existsSync(PATHS.standalone)) {
    copyDirSync(PATHS.standalone, path.join(STAGING_DIR, ".next", "standalone"));
    log("info", "Standalone output staged");
  } else {
    log("error", "Standalone build not found. Run 'next build' first.");
    log("warn", "Make sure next.config.ts has output: 'standalone'");
    process.exit(1);
  }

  // ─── Stage .next/static ────────────────────────────────────────────────────
  log("step", "Staging .next/static/...");
  if (fs.existsSync(PATHS.static)) {
    copyDirSync(PATHS.static, path.join(STAGING_DIR, ".next", "static"));
    log("info", "Static files staged");
  } else {
    log("warn", "No .next/static/ directory found");
  }

  // ─── Stage public/ ─────────────────────────────────────────────────────────
  log("step", "Staging public/...");
  if (fs.existsSync(PATHS.public)) {
    copyDirSync(PATHS.public, path.join(STAGING_DIR, "public"));
    log("info", "Public assets staged");
  } else {
    log("warn", "No public/ directory found");
    fs.mkdirSync(path.join(STAGING_DIR, "public"), { recursive: true });
  }

  // ─── Stage db/ ─────────────────────────────────────────────────────────────
  log("step", "Staging db/...");
  if (fs.existsSync(PATHS.db)) {
    copyDirSync(PATHS.db, path.join(STAGING_DIR, "db"));
    log("info", "Database directory staged");
  } else {
    log("warn", "No db/ directory found, creating empty one");
    fs.mkdirSync(path.join(STAGING_DIR, "db"), { recursive: true });
  }

  // ─── Stage prisma/ ─────────────────────────────────────────────────────────
  log("step", "Staging prisma/...");
  if (fs.existsSync(PATHS.prisma)) {
    copyDirSync(PATHS.prisma, path.join(STAGING_DIR, "prisma"));
    log("info", "Prisma schema staged");
  } else {
    log("warn", "No prisma/ directory found");
  }

  // ─── Stage essential node_modules ──────────────────────────────────────────
  log("step", "Staging essential node_modules/...");
  const essentialPkgs = [".prisma", "@prisma", "prisma"];
  if (fs.existsSync(PATHS.nodeModules)) {
    const nmDest = path.join(STAGING_DIR, "node_modules");
    fs.mkdirSync(nmDest, { recursive: true });

    for (const pkg of essentialPkgs) {
      const pkgSrc = path.join(PATHS.nodeModules, pkg);
      if (fs.existsSync(pkgSrc)) {
        copyDirSync(pkgSrc, path.join(nmDest, pkg));
        log("info", `Staged: ${pkg}`);
      }
    }
  } else {
    log("warn", "No node_modules/ directory found");
  }

  // ─── Create LICENSE.txt ────────────────────────────────────────────────────
  const licensePath = path.join(SCRIPT_DIR, "LICENSE.txt");
  if (!fs.existsSync(licensePath)) {
    const licenseContent = `Agentic OS v${APP_VERSION}
Copyright (c) 2024 AgenticOS Team

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    fs.writeFileSync(licensePath, licenseContent, "utf8");
    log("info", "Created default LICENSE.txt");
  }

  // ─── Copy icon ─────────────────────────────────────────────────────────────
  if (fs.existsSync(PATHS.iconIco)) {
    fs.copyFileSync(PATHS.iconIco, path.join(SCRIPT_DIR, "icon.ico"));
    log("info", "Icon file staged");
  } else {
    log("warn", "No icon.ico found in src-tauri/icons/");
  }

  // ─── Create .env template ──────────────────────────────────────────────────
  const envContent = `# Agentic OS Environment Configuration
DATABASE_URL=file:../db/agentic.db
PORT=${PORT}
HOSTNAME=0.0.0.0
NODE_ENV=production
`;
  fs.writeFileSync(path.join(STAGING_DIR, ".env.template"), envContent, "utf8");
  log("info", "Created .env.template");

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("");
  console.log("  ══════════════════════════════════════════════");
  console.log("  Staging Complete!");
  console.log("  ══════════════════════════════════════════════");
  console.log("");
  console.log(`  Staging dir: ${STAGING_DIR}`);
  console.log("");

  // List staged directories
  const staged = fs.readdirSync(STAGING_DIR, { withFileTypes: true });
  for (const entry of staged) {
    const stat = entry.isDirectory() ? "DIR " : "FILE";
    console.log(`    [${stat}] ${entry.name}`);
  }
  console.log("");
  console.log("  Next step: Run build-exe.ps1 or build-exe.sh to compile the installer");
  console.log("");
}

main();
