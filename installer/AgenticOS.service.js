/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Agentic OS v2.0.0 — Windows Service Manager
 * Runs AgenticOS as a Windows background service using node-windows
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node AgenticOS.service.js --install    Register & start the service
 *   node AgenticOS.service.js --uninstall  Stop & unregister the service
 *   node AgenticOS.service.js --start      Start the service
 *   node AgenticOS.service.js --stop       Stop the service
 *   node AgenticOS.service.js --status     Check service status
 *   node AgenticOS.service.js --run        Run directly (no service)
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");

// ─── Configuration ────────────────────────────────────────────────────────────
const APP_NAME = "Agentic OS";
const SERVICE_NAME = "AgenticOS";
const SERVICE_DESCRIPTION =
  "Agentic OS — Autonomous AI Operating System with 7-brain reasoning and agent swarms";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const INSTALL_DIR = path.resolve(__dirname);
const SERVER_DIR = path.join(INSTALL_DIR, "server");
const DB_DIR = path.join(INSTALL_DIR, "db");
const LOGS_DIR = path.join(INSTALL_DIR, "logs");
const PID_FILE = path.join(INSTALL_DIR, "agentic-os.pid");
const LOCK_FILE = path.join(INSTALL_DIR, "agentic-os.lock");

// Ensure directories exist
for (const dir of [DB_DIR, LOGS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Logger ───────────────────────────────────────────────────────────────────
const logStream = fs.createWriteStream(path.join(LOGS_DIR, "service.log"), {
  flags: "a",
});

const logger = {
  info: (msg) => {
    const line = `[${new Date().toISOString()}] [INFO]  ${msg}\n`;
    process.stdout.write(line);
    logStream.write(line);
  },
  warn: (msg) => {
    const line = `[${new Date().toISOString()}] [WARN]  ${msg}\n`;
    process.stdout.write(line);
    logStream.write(line);
  },
  error: (msg) => {
    const line = `[${new Date().toISOString()}] [ERROR] ${msg}\n`;
    process.stderr.write(line);
    logStream.write(line);
  },
};

// ─── Process Management ──────────────────────────────────────────────────────
let serverProcess = null;

/**
 * Start the Next.js server as a child process
 */
function startServer() {
  return new Promise((resolve, reject) => {
    if (serverProcess) {
      logger.warn("Server process already running");
      return resolve(serverProcess.pid);
    }

    // Check if already running via PID file
    if (fs.existsSync(PID_FILE)) {
      const existingPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      try {
        process.kill(existingPid, 0); // Check if process exists
        logger.warn(`Server already running with PID ${existingPid}`);
        return resolve(existingPid);
      } catch {
        // Process doesn't exist, clean up
        fs.unlinkSync(PID_FILE);
      }
    }

    logger.info(`Starting ${APP_NAME} server on ${HOST}:${PORT}...`);

    // Set environment
    const env = {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: HOST,
      DATABASE_URL: `file:${path.join(DB_DIR, "agentic.db")}`,
    };

    // Start the Next.js standalone server
    const serverPath = path.join(SERVER_DIR, "server.js");
    if (!fs.existsSync(serverPath)) {
      const err = `Server file not found: ${serverPath}`;
      logger.error(err);
      return reject(new Error(err));
    }

    serverProcess = spawn("node", [serverPath], {
      cwd: SERVER_DIR,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      windowsHide: true,
    });

    // Handle stdout
    serverProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.info(`[Server] ${output}`);
      }
    });

    // Handle stderr
    serverProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.error(`[Server] ${output}`);
      }
    });

    // Handle process exit
    serverProcess.on("exit", (code, signal) => {
      logger.warn(`Server process exited with code ${code}, signal ${signal}`);
      serverProcess = null;

      // Clean up PID file
      if (fs.existsSync(PID_FILE)) {
        try {
          const pid = fs.readFileSync(PID_FILE, "utf8").trim();
          if (pid === String(serverProcess?.pid || "")) {
            fs.unlinkSync(PID_FILE);
          }
        } catch {
          // Ignore
        }
      }

      // Auto-restart on unexpected exit (unless shutting down)
      if (!isShuttingDown && code !== 0) {
        logger.info("Server crashed, restarting in 5 seconds...");
        setTimeout(() => {
          startServer().catch((err) => logger.error(`Restart failed: ${err.message}`));
        }, 5000);
      }
    });

    serverProcess.on("error", (err) => {
      logger.error(`Failed to start server: ${err.message}`);
      serverProcess = null;
      reject(err);
    });

    // Write PID file
    fs.writeFileSync(PID_FILE, String(serverProcess.pid));
    logger.info(`Server started with PID ${serverProcess.pid}`);

    // Wait for server to be ready
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();
    const checkReady = setInterval(() => {
      const http = require("http");
      const req = http.request(
        { hostname: "localhost", port: PORT, path: "/", method: "HEAD", timeout: 2000 },
        (res) => {
          clearInterval(checkReady);
          logger.info(`${APP_NAME} is ready on http://localhost:${PORT}`);
          resolve(serverProcess.pid);
        }
      );
      req.on("error", () => {
        if (Date.now() - startTime > maxWait) {
          clearInterval(checkReady);
          logger.warn("Server startup timeout, but process is running");
          resolve(serverProcess.pid);
        }
      });
      req.on("timeout", () => {
        req.destroy();
      });
      req.end();
    }, 1000);
  });
}

let isShuttingDown = false;

/**
 * Stop the server gracefully
 */
function stopServer() {
  return new Promise((resolve) => {
    isShuttingDown = true;

    if (serverProcess) {
      logger.info("Stopping server gracefully...");

      // Send SIGTERM (on Windows, this uses taskkill)
      serverProcess.kill("SIGTERM");

      // Force kill after 10 seconds
      const forceKillTimer = setTimeout(() => {
        if (serverProcess) {
          logger.warn("Server did not stop gracefully, forcing...");
          serverProcess.kill("SIGKILL");
        }
      }, 10000);

      serverProcess.on("exit", () => {
        clearTimeout(forceKillTimer);
        serverProcess = null;
        logger.info("Server stopped");
        resolve();
      });
    } else {
      // Try to find and kill via PID file
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
        try {
          process.kill(pid, "SIGTERM");
          logger.info(`Sent SIGTERM to process ${pid}`);
        } catch {
          logger.warn(`Process ${pid} not found`);
        }
        fs.unlinkSync(PID_FILE);
      }
      resolve();
    }
  });
}

// ─── Windows Service Integration (using node-windows) ─────────────────────────

/**
 * Try to use node-windows for proper Windows service management
 */
async function withNodeWindows(action) {
  let Service;
  try {
    Service = require("node-windows").Service;
  } catch {
    logger.warn("node-windows not installed. Installing...");
    try {
      execSync("npm install node-windows", { cwd: INSTALL_DIR, stdio: "pipe" });
      Service = require("node-windows").Service;
    } catch (installErr) {
      logger.error(`Failed to install node-windows: ${installErr.message}`);
      logger.info("Falling back to manual process management...");
      return null;
    }
  }

  const svc = new Service({
    name: SERVICE_NAME,
    description: SERVICE_DESCRIPTION,
    script: path.join(INSTALL_DIR, "AgenticOS.service.js"),
    scriptOptions: "--run",
    nodeOptions: ["--harmony", "--max_old_space_size=4096"],
    workingDirectory: INSTALL_DIR,
    env: [
      { name: "NODE_ENV", value: "production" },
      { name: "PORT", value: String(PORT) },
      { name: "DATABASE_URL", value: `file:${path.join(DB_DIR, "agentic.db")}` },
    ],
  });

  return svc;
}

/**
 * Install as a Windows service
 */
async function installService() {
  logger.info(`Installing ${APP_NAME} as a Windows service...`);

  const svc = await withNodeWindows("install");
  if (!svc) {
    // Fallback: create a scheduled task
    logger.info("Creating a scheduled task instead...");
    return createScheduledTask();
  }

  return new Promise((resolve, reject) => {
    svc.on("install", () => {
      logger.info("Service installed successfully");
      svc.start();
    });

    svc.on("start", () => {
      logger.info("Service started successfully");
      resolve();
    });

    svc.on("error", (err) => {
      logger.error(`Service error: ${err.message}`);
      reject(err);
    });

    svc.on("alreadyinstalled", () => {
      logger.warn("Service already installed, reinstalling...");
      // Uninstall first, then install
      svc.on("uninstall", () => {
        svc.install();
      });
      svc.uninstall();
    });

    svc.install();
  });
}

/**
 * Uninstall the Windows service
 */
async function uninstallService() {
  logger.info(`Uninstalling ${APP_NAME} service...`);

  const svc = await withNodeWindows("uninstall");
  if (!svc) {
    return removeScheduledTask();
  }

  return new Promise((resolve, reject) => {
    svc.on("stop", () => {
      logger.info("Service stopped");
    });

    svc.on("uninstall", () => {
      logger.info("Service uninstalled successfully");
      resolve();
    });

    svc.on("error", (err) => {
      logger.error(`Service uninstall error: ${err.message}`);
      reject(err);
    });

    // Stop first if running
    try {
      svc.stop();
    } catch {
      // May already be stopped
    }
    svc.uninstall();
  });
}

/**
 * Fallback: Create a Windows scheduled task that starts on login
 */
function createScheduledTask() {
  return new Promise((resolve, reject) => {
    const taskName = "AgenticOS_AutoStart";
    const scriptPath = path.join(INSTALL_DIR, "AgenticOS.service.js");

    const cmd = `schtasks /create /tn "${taskName}" /tr "node \\"${scriptPath}\\" --run" /sc onlogon /rl highest /f`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Failed to create scheduled task: ${error.message}`);
        return reject(error);
      }
      logger.info("Scheduled task created for auto-start on login");

      // Start now
      exec(`schtasks /run /tn "${taskName}"`, (err) => {
        if (err) {
          logger.warn(`Failed to run scheduled task: ${err.message}`);
        } else {
          logger.info("Scheduled task started");
        }
        resolve();
      });
    });
  });
}

/**
 * Remove the scheduled task
 */
function removeScheduledTask() {
  return new Promise((resolve) => {
    const taskName = "AgenticOS_AutoStart";
    exec(`schtasks /delete /tn "${taskName}" /f`, (error) => {
      if (error) {
        logger.warn(`Scheduled task not found or already removed`);
      } else {
        logger.info("Scheduled task removed");
      }
      resolve();
    });
  });
}

/**
 * Check service status
 */
async function checkStatus() {
  console.log(`\n  ${APP_NAME} Service Status`);
  console.log("  ──────────────────────────────");

  // Check PID file
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, "utf8").trim();
    try {
      process.kill(parseInt(pid, 10), 0);
      console.log(`  Status:  Running (PID: ${pid})`);
    } catch {
      console.log(`  Status:  Stopped (stale PID file)`);
    }
  } else {
    console.log(`  Status:  Stopped`);
  }

  // Check port
  const http = require("http");
  const req = http.request(
    { hostname: "localhost", port: PORT, path: "/", method: "HEAD", timeout: 2000 },
    (res) => {
      console.log(`  Port:    ${PORT} (listening)`);
      console.log(`  URL:     http://localhost:${PORT}`);
      printServiceStatus();
    }
  );
  req.on("error", () => {
    console.log(`  Port:    ${PORT} (not listening)`);
    printServiceStatus();
  });
  req.end();
}

function printServiceStatus() {
  // Check scheduled task
  exec('schtasks /query /tn "AgenticOS_AutoStart"', (error, stdout) => {
    if (!error) {
      console.log(`  Service: Scheduled Task (AgenticOS_AutoStart)`);
    } else {
      console.log(`  Service: Not registered`);
    }
    console.log(`  Dir:     ${INSTALL_DIR}`);
    console.log(`  Logs:    ${LOGS_DIR}`);
    console.log(`  DB:      ${DB_DIR}\n`);
  });
}

// ─── Signal Handlers ─────────────────────────────────────────────────────────
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down...");
  await stopServer();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down...");
  await stopServer();
  process.exit(0);
});

process.on("SIGHUP", () => {
  logger.info("Received SIGHUP, restarting server...");
  stopServer().then(() => startServer());
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${err.message}\n${err.stack}`);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const action = process.argv[2] || "--status";

  try {
    switch (action) {
      case "--install":
        await installService();
        break;

      case "--uninstall":
        await stopServer();
        await uninstallService();
        break;

      case "--start":
        await startServer();
        break;

      case "--stop":
        await stopServer();
        break;

      case "--status":
        await checkStatus();
        break;

      case "--run":
        // Direct run mode (used by service wrapper)
        logger.info(`Running ${APP_NAME} in direct mode...`);
        await startServer();

        // Keep the process alive
        setInterval(() => {
          // Health check / heartbeat
        }, 60000);
        break;

      default:
        console.log(`
  Agentic OS Service Manager

  Usage: node AgenticOS.service.js <command>

  Commands:
    --install    Install and start as a Windows service
    --uninstall  Stop and remove the Windows service
    --start      Start the server directly
    --stop       Stop the running server
    --status     Check service status
    --run        Run in direct mode (used by service wrapper)
        `);
        break;
    }
  } catch (err) {
    logger.error(`Command failed: ${err.message}`);
    process.exit(1);
  }
}

// Need execSync for node-windows install
const { execSync } = require("child_process");

main();
