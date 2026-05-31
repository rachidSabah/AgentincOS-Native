import { NextRequest, NextResponse } from 'next/server';

const GITHUB_REPO = 'rachidSabah/Agentic-os';
const GITHUB_API = 'https://api.github.com';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
    };
  };
  html_url: string;
}

interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
  node_id: string;
}

interface UpdateEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'security' | 'performance';
  status: 'available' | 'downloading' | 'installing' | 'installed' | 'failed';
  size: number;
  changelog: string;
  timestamp: number;
  commitHash: string;
}

function parseUpdateType(message: string): 'feature' | 'fix' | 'security' | 'performance' {
  const lower = message.toLowerCase();
  if (lower.includes('security') || lower.includes('vuln') || lower.includes('cve')) return 'security';
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch') || lower.includes('hotfix')) return 'fix';
  if (lower.includes('perf') || lower.includes('optim') || lower.includes('speed') || lower.includes('fast')) return 'performance';
  return 'feature';
}

function semverCompare(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function fetchGitHub<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API}${endpoint}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Agentic-OS-Update-Checker',
      },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function checkForUpdates(currentVersion: string, channel: string): Promise<{
  hasUpdates: boolean;
  updates: UpdateEntry[];
  latestVersion: string;
  currentVersion: string;
}> {
  // Fetch tags and recent commits in parallel
  const [tags, commits] = await Promise.all([
    fetchGitHub<GitHubTag[]>(`/repos/${GITHUB_REPO}/tags?per_page=10`),
    fetchGitHub<GitHubCommit[]>(`/repos/${GITHUB_REPO}/commits?per_page=20`),
  ]);

  const updates: UpdateEntry[] = [];
  let latestVersion = currentVersion;
  let hasRealUpdates = false;

  // Process tags - find versions newer than current
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      if (semverCompare(tag.name, currentVersion) > 0) {
        hasRealUpdates = true;
        const type = parseUpdateType(tag.name);
        updates.push({
          id: `tag-${tag.name}`,
          version: tag.name.replace(/^v/, ''),
          title: `Release ${tag.name}`,
          description: `New release available: ${tag.name}. Includes the latest features and improvements.`,
          type,
          status: 'available',
          size: Math.floor(Math.random() * 500000) + 100000, // estimated size
          changelog: `Release ${tag.name}`,
          timestamp: Date.now(),
          commitHash: tag.commit.sha.substring(0, 7),
        });
        if (semverCompare(tag.name, latestVersion) > 0) {
          latestVersion = tag.name.replace(/^v/, '');
        }
      }
    }
  }

  // Process recent commits as incremental updates (only for nightly/beta channels)
  if (commits && commits.length > 0 && channel !== 'stable') {
    const commitUpdates: UpdateEntry[] = [];
    for (const commit of commits) {
      const message = commit.commit.message.split('\n')[0];
      const type = parseUpdateType(message);
      const shortSha = commit.sha.substring(0, 7);
      const commitDate = new Date(commit.commit.author.date).getTime();

      commitUpdates.push({
        id: `commit-${shortSha}`,
        version: `${currentVersion}-dev.${shortSha}`,
        title: message.length > 60 ? message.substring(0, 57) + '...' : message,
        description: message,
        type,
        status: 'available',
        size: Math.floor(Math.random() * 200000) + 50000,
        changelog: commit.commit.message,
        timestamp: commitDate,
        commitHash: shortSha,
      });
    }

    const seenVersions = new Set(updates.map(u => u.version));
    for (const cu of commitUpdates) {
      if (!seenVersions.has(cu.version) && updates.length < 10) {
        updates.push(cu);
        seenVersions.add(cu.version);
      }
    }
  }

  // If no real updates from GitHub, generate demo updates for showcase
  if (!hasRealUpdates) {
    const demoUpdates: UpdateEntry[] = [
      {
        id: 'demo-021',
        version: '0.2.1',
        title: 'Swarm Intelligence Protocol v2',
        description: 'Enhanced multi-agent swarm coordination with consensus voting, delegation strategies, and real-time proposal tracking.',
        type: 'feature',
        status: 'available',
        size: 327680,
        changelog: '- Added consensus voting strategy\n- Delegation mode for hierarchical tasks\n- Race mode for fastest-agent-wins scenarios\n- Real-time proposal tracking and visualization',
        timestamp: Date.now() - 3600000,
        commitHash: 'f1a2b3c',
      },
      {
        id: 'demo-020',
        version: '0.2.0',
        title: 'Memory Engine Dashboard',
        description: 'Full memory management system with graph visualization, timeline tracking, semantic search, and cross-agent memory sharing.',
        type: 'feature',
        status: 'available',
        size: 512000,
        changelog: '- Knowledge graph visualization\n- Memory timeline with event tracking\n- Semantic and keyword search\n- Agent memory sharing protocol\n- Memory extraction engine',
        timestamp: Date.now() - 7200000,
        commitHash: 'd4e5f6g',
      },
      {
        id: 'demo-019',
        version: '0.1.10',
        title: 'Cross-Agent Latency Optimization',
        description: 'Reduced p99 latency across all 7 layers by 34% through improved routing and connection pooling.',
        type: 'performance',
        status: 'available',
        size: 163840,
        changelog: '- Optimized OpenClaw routing table\n- Connection pooling for agent communications\n- Reduced message bus overhead by 45%\n- Faster vault query responses',
        timestamp: Date.now() - 14400000,
        commitHash: 'h7i8j9k',
      },
      {
        id: 'demo-018',
        version: '0.1.9.1',
        title: 'Vault Access Control Hotfix',
        description: 'Critical fix for vault access control bypass that could allow unauthorized memory access between agents.',
        type: 'security',
        status: 'available',
        size: 45056,
        changelog: '- Fixed access control bypass in vault sharing\n- Added PII detection for memory entries\n- Encrypted memory transport between agents\n- Added audit logging for vault access',
        timestamp: Date.now() - 28800000,
        commitHash: 'l0m1n2o',
      },
      {
        id: 'demo-017',
        version: '0.1.9',
        title: 'Hermes Browser Pool Fix',
        description: 'Fixed browser pool capacity overflow causing timeouts during concurrent research tasks.',
        type: 'fix',
        status: 'available',
        size: 98304,
        changelog: '- Implemented priority queue for browser sessions\n- Fixed timeout errors during peak usage\n- Added rate limiting per agent\n- Improved error recovery',
        timestamp: Date.now() - 43200000,
        commitHash: 'p3q4r5s',
      },
    ];

    updates.push(...demoUpdates);
    if (demoUpdates.length > 0) {
      latestVersion = demoUpdates[0].version;
    }
  }

  return {
    hasUpdates: updates.length > 0,
    updates,
    latestVersion,
    currentVersion,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'check';
  const currentVersion = searchParams.get('version') || '0.2.0';
  const channel = searchParams.get('channel') || 'stable';

  switch (action) {
    case 'check': {
      const result = await checkForUpdates(currentVersion, channel);
      return NextResponse.json(result);
    }

    case 'status': {
      return NextResponse.json({
        currentVersion,
        lastChecked: Date.now(),
        channel,
        status: 'up-to-date',
      });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, updateId } = body;

  switch (action) {
    case 'install': {
      // Simulate install process
      return NextResponse.json({
        success: true,
        updateId,
        message: `Update ${updateId} installed successfully`,
        timestamp: Date.now(),
      });
    }

    case 'rollback': {
      // Simulate rollback
      return NextResponse.json({
        success: true,
        updateId,
        message: `Update ${updateId} rolled back successfully`,
        timestamp: Date.now(),
      });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
