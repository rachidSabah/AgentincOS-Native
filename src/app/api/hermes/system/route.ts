import { NextRequest, NextResponse } from "next/server";
import { cpus, totalmem, freemem, loadavg, networkInterfaces, uptime } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Cache — 60-second TTL to avoid hammering the OS
// ---------------------------------------------------------------------------

interface CachedMetrics {
  timestamp: number;
  data: SystemMetrics;
}

let cachedMetrics: CachedMetrics | null = null;
const CACHE_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CpuCore {
  model: string;
  speed: number;
  times: {
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
  };
  usagePercent: number;
}

interface CpuInfo {
  model: string;
  cores: number;
  speedMhz: number;
  loadAvg: {
    "1min": number;
    "5min": number;
    "15min": number;
  };
  perCore: CpuCore[];
  overallUsagePercent: number;
}

interface MemoryInfo {
  total: number;
  free: number;
  used: number;
  usagePercent: number;
}

interface DiskInfo {
  filesystem: string;
  total: number;
  used: number;
  available: number;
  usagePercent: number;
  mountPoint: string;
}

interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
}

interface NetworkStats {
  interfaces: NetworkInterface[];
  traffic?: {
    bytesReceived: number;
    bytesSent: number;
  };
}

interface ProcessInfo {
  pid: number;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
}

interface HermesProcessInfo {
  running: boolean;
  pid?: number;
  memoryMb?: number;
  cpuPercent?: number;
  command?: string;
}

interface GpuInfo {
  name: string;
  memoryUsedMb: number;
  memoryTotalMb: number;
  utilizationPercent: number;
}

interface SystemMetrics {
  timestamp: string;
  cached: boolean;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskInfo[];
  network: NetworkStats;
  process: ProcessInfo;
  hermes: HermesProcessInfo;
  gpu: GpuInfo[] | null;
  osUptime: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateCpuUsage(): { perCore: CpuCore[]; overall: number } {
  const cpuList = cpus();

  // To get actual usage percentages, we need two readings
  // Since we can't easily do async wait in a single request,
  // we estimate from current times
  const perCore: CpuCore[] = cpuList.map((cpu) => {
    const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    const active = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq;
    const usagePercent = total > 0 ? (active / total) * 100 : 0;

    return {
      model: cpu.model,
      speed: cpu.speed,
      times: { ...cpu.times },
      usagePercent: Math.round(usagePercent * 100) / 100,
    };
  });

  const overallActive = perCore.reduce((sum, c) => sum + c.usagePercent, 0);
  const overall = perCore.length > 0 ? overallActive / perCore.length : 0;

  return { perCore, overall: Math.round(overall * 100) / 100 };
}

async function getDiskUsage(): Promise<DiskInfo[]> {
  try {
    const { stdout } = await execFileAsync("df", ["-k", "-P"], { timeout: 5000 });
    const lines = stdout.trim().split("\n");

    // Skip header, filter for real filesystems (not tmpfs, devtmpfs, etc.)
    const disks: DiskInfo[] = [];
    const skipFilesystems = new Set(["tmpfs", "devtmpfs", "overlay", "shm", "cgroup", "cgroup2", "proc", "sysfs", "devpts", "mqueue", "hugetlbfs", "debugfs", "tracefs", "securityfs", "pstore", "bpf", "configfs", "fusectl", "efivarfs", "ossfs"]);

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i]!.split(/\s+/);
      if (parts.length < 6) continue;

      const filesystem = parts[0]!;
      const mountPoint = parts[5]!;

      // Skip virtual / pseudo filesystems
      if (skipFilesystems.has(filesystem)) continue;
      // Skip mounts under /sys, /proc, /dev
      if (mountPoint.startsWith("/sys") || mountPoint.startsWith("/proc") || mountPoint.startsWith("/dev")) continue;
      // Skip huge or unrealistic sizes (e.g. ossfs with 16EB)
      const totalKb = parseInt(parts[1]!, 10);
      if (totalKb > 1_000_000_000) continue; // >1TB in KB is suspiciously large for local disk

      const total = totalKb * 1024; // Convert KB to bytes
      const used = parseInt(parts[2]!, 10) * 1024;
      const available = parseInt(parts[3]!, 10) * 1024;

      // Avoid duplicates for the same mount
      if (disks.some((d) => d.mountPoint === mountPoint)) continue;

      disks.push({
        filesystem,
        total,
        used,
        available,
        usagePercent: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
        mountPoint,
      });
    }

    return disks.length > 0 ? disks : [{
      filesystem: "unknown",
      total: 0,
      used: 0,
      available: 0,
      usagePercent: 0,
      mountPoint: "/",
    }];
  } catch {
    return [{
      filesystem: "unknown",
      total: 0,
      used: 0,
      available: 0,
      usagePercent: 0,
      mountPoint: "/",
    }];
  }
}

function getNetworkStats(): NetworkStats {
  const ifaces = networkInterfaces();
  const interfaces: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      interfaces.push({
        name,
        address: addr.address,
        netmask: addr.netmask,
        family: addr.family,
        mac: addr.mac,
        internal: addr.internal,
      });
    }
  }

  // Try to read traffic stats from /proc/net/dev (Linux only)
  let traffic: NetworkStats["traffic"];
  try {
    const procNet = readFileSync("/proc/net/dev", "utf-8");
    const lines = procNet.trim().split("\n");
    let bytesReceived = 0;
    let bytesSent = 0;

    // Skip first 2 header lines
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i]!.trim().split(/\s+/);
      if (parts.length < 10) continue;
      // Skip lo (loopback)
      const iface = parts[0]!.replace(":", "");
      if (iface === "lo") continue;

      bytesReceived += parseInt(parts[1]!, 10);
      bytesSent += parseInt(parts[9]!, 10);
    }

    traffic = { bytesReceived, bytesSent };
  } catch {
    // /proc/net/dev not available (non-Linux)
    traffic = undefined;
  }

  return { interfaces, traffic };
}

async function getHermesProcess(): Promise<HermesProcessInfo> {
  try {
    const { stdout } = await execFileAsync("ps", ["aux"], { timeout: 3000 });
    const lines = stdout.trim().split("\n");

    // Look for actual hermes binary/process — not curl/wget/fetch commands that
    // happen to contain "hermes" in their URL arguments
    const hermesBinPatterns = [
      /\bhermes\b/i,          // standalone hermes binary
      /hermes\.(exe|bin)/i,   // explicit binary extensions
      /hermes\s+(gateway|api|serve|start|run)/i,  // hermes subcommands
    ];

    for (const line of lines) {
      // Skip grep, curl, wget, and defunct processes
      if (/grep|curl|wget|fetch|defunct/i.test(line)) continue;
      if (!/hermes/i.test(line)) continue;

      // Verify it looks like an actual hermes process, not a URL in a command
      const commandPart = line.split(/\s+/).slice(10).join(" ");
      const isRealProcess = hermesBinPatterns.some((p) => p.test(commandPart));
      // Also allow if hermes appears as the executable name (not inside a URL)
      const isUrlCommand = /https?:\/\/.*hermes/i.test(commandPart);
      if (!isRealProcess && isUrlCommand) continue;

      const parts = line.split(/\s+/);
      const pid = parseInt(parts[1]!, 10);
      const cpuPercent = parseFloat(parts[2]!);
      const memPercent = parseFloat(parts[3]!);

      // Calculate memory in MB from percentage of total
      const totalMem = totalmem();
      const memoryMb = (memPercent / 100) * totalMem / (1024 * 1024);

      return {
        running: true,
        pid: pid > 0 ? pid : undefined,
        memoryMb: Math.round(memoryMb * 100) / 100,
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        command: commandPart.slice(0, 200),
      };
    }

    return { running: false };
  } catch {
    return { running: false };
  }
}

async function getGpuInfo(): Promise<GpuInfo[] | null> {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      [
        "--query-gpu=name,memory.used,memory.total,utilization.gpu",
        "--format=csv,noheader,nounits",
      ],
      { timeout: 5000 },
    );

    const lines = stdout.trim().split("\n");
    const gpus: GpuInfo[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length >= 4) {
        gpus.push({
          name: parts[0]!,
          memoryUsedMb: parseFloat(parts[1]!) || 0,
          memoryTotalMb: parseFloat(parts[2]!) || 0,
          utilizationPercent: parseFloat(parts[3]!) || 0,
        });
      }
    }

    return gpus.length > 0 ? gpus : null;
  } catch {
    // nvidia-smi not available — no GPU info
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET handler — return real system metrics
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  // Return cached data if still fresh
  if (cachedMetrics && Date.now() - cachedMetrics.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedMetrics.data,
      cached: true,
    });
  }

  try {
    // Gather all metrics in parallel
    const [diskInfo, hermesProc, gpuInfo] = await Promise.all([
      getDiskUsage(),
      getHermesProcess(),
      getGpuInfo(),
    ]);

    // Synchronous metrics
    const cpuUsage = calculateCpuUsage();
    const total = totalmem();
    const free = freemem();
    const used = total - free;
    const loads = loadavg();
    const netStats = getNetworkStats();
    const memUsage = process.memoryUsage();
    const cpuUsageProc = process.cpuUsage();

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      cached: false,
      cpu: {
        model: cpus()[0]?.model ?? "Unknown",
        cores: cpus().length,
        speedMhz: cpus()[0]?.speed ?? 0,
        loadAvg: {
          "1min": Math.round(loads[0]! * 100) / 100,
          "5min": Math.round(loads[1]! * 100) / 100,
          "15min": Math.round(loads[2]! * 100) / 100,
        },
        perCore: cpuUsage.perCore,
        overallUsagePercent: cpuUsage.overall,
      },
      memory: {
        total,
        free,
        used,
        usagePercent: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
      },
      disk: diskInfo,
      network: netStats,
      process: {
        pid: process.pid,
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        cpuUsage: {
          user: cpuUsageProc.user,
          system: cpuUsageProc.system,
        },
        uptime: process.uptime(),
      },
      hermes: hermesProc,
      gpu: gpuInfo,
      osUptime: uptime(),
    };

    // Update cache
    cachedMetrics = {
      timestamp: Date.now(),
      data: metrics,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to collect system metrics",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
