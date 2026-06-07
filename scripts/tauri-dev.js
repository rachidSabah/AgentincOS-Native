// scripts/tauri-dev.js
// Start Next.js dev server and then Tauri dev
const { spawn, exec } = require('child_process');
const http = require('http');

const NEXT_PORT = 3000;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // 1 second

/**
 * Checks if the Next.js dev server is ready by making an HTTP request.
 */
function waitForNextDev() {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = () => {
      const req = http.get(`http://localhost:${NEXT_PORT}`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`✅ Next.js dev server is ready on port ${NEXT_PORT}`);
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      retries++;
      if (retries >= MAX_RETRIES) {
        reject(new Error(`Next.js dev server did not start after ${MAX_RETRIES} retries`));
        return;
      }
      process.stdout.write('.');
      setTimeout(check, RETRY_INTERVAL);
    };

    console.log(`⏳ Waiting for Next.js dev server on port ${NEXT_PORT}`);
    check();
  });
}

/**
 * Starts the Next.js dev server.
 */
function startNextDev() {
  console.log('🚀 Starting Next.js dev server...');

  const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: String(NEXT_PORT) },
  });

  nextDev.stdout.on('data', (data) => {
    const output = data.toString();
    // Only print important lines, not all the compilation noise
    if (
      output.includes('Ready') ||
      output.includes('Error') ||
      output.includes('compiled') ||
      output.includes('Local:')
    ) {
      console.log(`[Next.js] ${output.trim()}`);
    }
  });

  nextDev.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Error') || output.includes('error')) {
      console.error(`[Next.js Error] ${output.trim()}`);
    }
  });

  nextDev.on('close', (code) => {
    console.log(`Next.js dev server exited with code ${code}`);
    process.exit(code || 0);
  });

  return nextDev;
}

/**
 * Starts the Tauri dev process.
 */
function startTauriDev() {
  console.log('🦀 Starting Tauri dev...');

  const tauriDev = spawn('npx', ['tauri', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  tauriDev.on('close', (code) => {
    console.log(`Tauri dev process exited with code ${code}`);
    process.exit(code || 0);
  });

  return tauriDev;
}

/**
 * Main entry point.
 */
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Agentic OS V2 — Tauri Dev Launcher     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // Start Next.js dev server
  const nextProcess = startNextDev();

  // Wait for Next.js to be ready
  try {
    await waitForNextDev();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    nextProcess.kill();
    process.exit(1);
  }

  // Start Tauri dev
  const tauriProcess = startTauriDev();

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\n🛑 Shutting down...');
    nextProcess.kill();
    tauriProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
