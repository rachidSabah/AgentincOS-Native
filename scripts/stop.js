#!/usr/bin/env node

/**
 * Agentic OS — Cross-platform stop script
 * Kills the running Agentic OS server on port 3100
 * Works on Windows, macOS, and Linux
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const IS_WIN = process.platform === 'win32';

function stop() {
  console.log('[Agentic OS] Stopping server...');

  // Try PID file first
  const pidFile = path.join(process.cwd(), '.agentic-os.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const pid = fs.readFileSync(pidFile, 'utf-8').trim();
      if (pid) {
        if (IS_WIN) {
          spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' });
        } else {
          process.kill(Number(pid), 'SIGTERM');
        }
        fs.unlinkSync(pidFile);
        console.log(`[Agentic OS] Stopped process ${pid}`);
        return;
      }
    } catch (e) {
      // PID file process may have already exited
      try { fs.unlinkSync(pidFile); } catch {}
    }
  }

  // Fallback: kill by port
  if (IS_WIN) {
    try {
      const result = execSync('netstat -aon | findstr :3100 | findstr LISTENING', {
        encoding: 'utf-8',
        windowsHide: true,
      });
      const match = result.match(/(\d+)\s*$/m);
      if (match) {
        const pid = match[1].trim();
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit', windowsHide: true });
        console.log(`[Agentic OS] Stopped process ${pid} on port 3100`);
        return;
      }
    } catch {}
  } else {
    try {
      const result = execSync('lsof -ti :3100', { encoding: 'utf-8' });
      const pids = result.trim().split('\n').filter(Boolean);
      if (pids.length > 0) {
        for (const pid of pids) {
          try { process.kill(Number(pid.trim()), 'SIGTERM'); } catch {}
        }
        console.log(`[Agentic OS] Stopped ${pids.length} process(es) on port 3100`);
        return;
      }
    } catch {}
  }

  console.log('[Agentic OS] No running process found on port 3100');
}

stop();
