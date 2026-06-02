#!/usr/bin/env node

/**
 * Agentic OS — One-command installation script
 * Cross-platform: works on Windows, macOS, and Linux
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const IS_WIN = process.platform === 'win32';

function run(cmd, opts = {}) {
  console.log(`\x1b[36m>\x1b[0m ${cmd}`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      windowsHide: true,
      ...opts,
    });
    return true;
  } catch (e) {
    console.error(`\x1b[31m✗ Command failed: ${cmd}\x1b[0m`);
    return false;
  }
}

function checkCommand(cmd) {
  try {
    const result = IS_WIN
      ? spawnSync('where', [cmd], { windowsHide: true })
      : spawnSync('which', [cmd]);
    return result.status === 0;
  } catch {
    return false;
  }
}

function main() {
  console.log('\n\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║   🚀 Agentic OS V5.0 — Installer           ║\x1b[0m');
  console.log('\x1b[35m║   Cyberpunk AI OS Dashboard                 ║\x1b[0m');
  console.log('\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m\n');

  // 1. Check Node.js
  console.log('\x1b[33m[1/6] Checking Node.js...\x1b[0m');
  if (!checkCommand('node')) {
    console.error('\x1b[31m✗ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org\x1b[0m');
    process.exit(1);
  }
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  console.log(`\x1b[32m✓ Node.js ${nodeVersion} detected\x1b[0m`);

  // 2. Check npm
  console.log('\x1b[33m[2/6] Checking npm...\x1b[0m');
  if (!checkCommand('npm')) {
    console.error('\x1b[31m✗ npm is not installed. It should come with Node.js.\x1b[0m');
    process.exit(1);
  }
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`\x1b[32m✓ npm ${npmVersion} detected\x1b[0m`);

  // 3. Install dependencies
  console.log('\x1b[33m[3/6] Installing dependencies...\x1b[0m');
  if (!run('npm install')) {
    console.error('\x1b[31m✗ Failed to install dependencies\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32m✓ Dependencies installed\x1b[0m');

  // 4. Build the project
  console.log('\x1b[33m[4/6] Building Agentic OS...\x1b[0m');
  if (!run('npm run build')) {
    console.error('\x1b[31m✗ Build failed. Try running "npm run build" manually.\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32m✓ Build completed\x1b[0m');

  // 5. Write PID directory
  console.log('\x1b[33m[5/6] Setting up runtime files...\x1b[0m');
  const pidFile = path.join(process.cwd(), '.agentic-os.pid');
  if (!fs.existsSync(pidFile)) {
    fs.writeFileSync(pidFile, '', 'utf-8');
  }
  console.log('\x1b[32m✓ Runtime files ready\x1b[0m');

  // 6. Success
  console.log('\x1b[33m[6/6] Installation complete!\x1b[0m');
  console.log('\n\x1b[32m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[32m║   ✓ Agentic OS V5.0 installed successfully  ║\x1b[0m');
  console.log('\x1b[32m╚══════════════════════════════════════════════╝\x1b[0m');
  console.log('\n\x1b[36mTo start the server:\x1b[0m');
  console.log('  \x1b[1mnpm start\x1b[0m          — Production mode (port 3100)');
  console.log('  \x1b[1mnpm run dev\x1b[0m        — Development mode with hot reload');
  console.log('\n\x1b[36mOther commands:\x1b[0m');
  console.log('  \x1b[1mnpm run stop\x1b[0m       — Stop the running server');
  console.log('  \x1b[1mnpm run restart\x1b[0m   — Restart the server');
  console.log('  \x1b[1mnpm run uninstall\x1b[0m — Remove installed files');
  console.log('\n\x1b[36mOpen in browser:\x1b[0m  \x1b[4mhttp://localhost:3100\x1b[0m\n');
}

main();
