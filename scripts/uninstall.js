#!/usr/bin/env node

/**
 * Agentic OS — One-command uninstallation script
 * Cross-platform: works on Windows, macOS, and Linux
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const IS_WIN = process.platform === 'win32';

function main() {
  console.log('\n\x1b[33m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[33m║   🗑️  Agentic OS — Uninstaller              ║\x1b[0m');
  console.log('\x1b[33m╚══════════════════════════════════════════════╝\x1b[0m\n');

  const projectDir = process.cwd();

  // 1. Stop the server if running
  console.log('\x1b[33m[1/4] Stopping server...\x1b[0m');
  try {
    if (IS_WIN) {
      const result = execSync('netstat -aon | findstr :3100 | findstr LISTENING', {
        encoding: 'utf-8',
        windowsHide: true,
      });
      const match = result.match(/(\d+)\s*$/m);
      if (match) {
        execSync(`taskkill /PID ${match[1].trim()} /F`, { windowsHide: true });
        console.log('\x1b[32m✓ Server stopped\x1b[0m');
      }
    } else {
      execSync('lsof -ti :3100 | xargs kill 2>/dev/null', { stdio: 'ignore' });
      console.log('\x1b[32m✓ Server stopped\x1b[0m');
    }
  } catch {
    console.log('\x1b[32m✓ No running server found\x1b[0m');
  }

  // 2. Remove build artifacts
  console.log('\x1b[33m[2/4] Removing build artifacts...\x1b[0m');
  const dirsToRemove = ['.next', 'node_modules/.cache'];
  for (const dir of dirsToRemove) {
    const dirPath = path.join(projectDir, dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`  ✓ Removed ${dir}/`);
    }
  }
  console.log('\x1b[32m✓ Build artifacts removed\x1b[0m');

  // 3. Remove runtime files
  console.log('\x1b[33m[3/4] Removing runtime files...\x1b[0m');
  const filesToRemove = ['.agentic-os.pid', 'dev.log', 'server.log'];
  for (const file of filesToRemove) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  ✓ Removed ${file}`);
    }
  }
  console.log('\x1b[32m✓ Runtime files removed\x1b[0m');

  // 4. Remove node_modules (optional, ask)
  console.log('\x1b[33m[4/4] Cleaning up...\x1b[0m');
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('  Removing node_modules... (this may take a moment)');
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('  ✓ Removed node_modules/');
  }
  console.log('\x1b[32m✓ Cleanup complete\x1b[0m');

  console.log('\n\x1b[32m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[32m║   ✓ Agentic OS uninstalled successfully     ║\x1b[0m');
  console.log('\x1b[32m╚══════════════════════════════════════════════╝\x1b[0m');
  console.log('\n\x1b[36mTo reinstall:\x1b[0m  \x1b[1mnpm run install-agentic\x1b[0m\n');
}

main();
