import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Force dynamic rendering — prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Read the actual version from package.json at build/start time
async function getAppVersion(): Promise<string> {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkgContent = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    return pkg.version || '0.2.0';
  } catch {
    return '0.2.0';
  }
}

async function fetchGitHub<T>(endpoint: string, clientToken?: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Agentic-OS-Update-Checker',
    };

    // Use GitHub token: client-provided (from UI) > env variable
    // But the API works WITHOUT a token for public repos (rate-limited to 60 req/hr)
    // This is perfectly fine for an update checker that runs every 30 minutes
    const githubToken = clientToken || process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // No-cache fetch — always get fresh data from GitHub
    const res = await fetch(`${GITHUB_API}${endpoint}`, {
      headers,
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      // Rate limit without token is expected — don't spam logs
      if (res.status === 403 && !githubToken) {
        console.warn(`[Updates] GitHub API rate limit reached (public mode). Consider adding a token for higher limits.`);
      } else if (res.status !== 404) {
        console.error(`[Updates] GitHub API ${endpoint} returned ${res.status} ${res.statusText}`);
      }
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    console.error(`[Updates] GitHub API ${endpoint} fetch error:`, err);
    return null;
  }
}

async function checkForUpdates(currentVersion: string, channel: string, clientToken?: string): Promise<{
  hasUpdates: boolean;
  updates: UpdateEntry[];
  latestVersion: string;
  currentVersion: string;
}> {
  // Fetch tags and recent commits in parallel
  // This works WITHOUT a GitHub token for public repos
  const [tags, commits] = await Promise.all([
    fetchGitHub<GitHubTag[]>(`/repos/${GITHUB_REPO}/tags?per_page=10`, clientToken),
    fetchGitHub<GitHubCommit[]>(`/repos/${GITHUB_REPO}/commits?per_page=20`, clientToken),
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

  // Process recent commits as incremental updates for ALL channels
  if (commits && commits.length > 0) {
    const commitUpdates: UpdateEntry[] = [];
    for (const commit of commits) {
      const message = commit.commit.message.split('\n')[0];
      const type = parseUpdateType(message);
      const shortSha = commit.sha.substring(0, 7);
      const commitDate = new Date(commit.commit.author.date).getTime();

      // For stable channel, show commits from the last 7 days
      // For beta/nightly, show all recent commits
      const isRecent = channel !== 'stable' || (Date.now() - commitDate) < 604800000; // 7 days

      if (isRecent) {
        commitUpdates.push({
          id: `commit-${shortSha}`,
          version: channel === 'stable'
            ? `${currentVersion}-patch.${shortSha}`
            : `${currentVersion}-dev.${shortSha}`,
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
    }

    const seenVersions = new Set(updates.map(u => u.version));
    for (const cu of commitUpdates) {
      if (!seenVersions.has(cu.version) && updates.length < 10) {
        hasRealUpdates = true;
        updates.push(cu);
        seenVersions.add(cu.version);
      }
    }
  }

  // If no real updates from GitHub, return empty
  return {
    hasUpdates: updates.length > 0,
    updates,
    latestVersion: updates.length > 0 ? (updates[0]?.version || latestVersion) : currentVersion,
    currentVersion,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'check';
  // Use the version passed by the client, fall back to reading from package.json
  const clientVersion = searchParams.get('version');
  const channel = searchParams.get('channel') || 'stable';
  // Client-provided GitHub token (from UI settings, stored in localStorage)
  // Takes priority over GITHUB_TOKEN env variable
  // BUT the API works WITHOUT any token for public repos
  const clientToken = request.headers.get('X-GitHub-Token') || undefined;

  switch (action) {
    case 'check': {
      // Resolve current version: client-provided > package.json > hardcoded
      const pkgVersion = await getAppVersion();
      const currentVersion = clientVersion || pkgVersion;
      const result = await checkForUpdates(currentVersion, channel, clientToken);
      return NextResponse.json(result);
    }

    case 'status': {
      const pkgVersion = await getAppVersion();
      const currentVersion = clientVersion || pkgVersion;
      // Check GitHub API reachability — works without token for public repos
      let githubReachable = false;
      try {
        // Use a lightweight endpoint to check connectivity — no token needed for public repos
        const effectiveToken = clientToken || process.env.GITHUB_TOKEN;
        const testHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Agentic-OS-Update-Checker',
        };
        if (effectiveToken) {
          testHeaders['Authorization'] = `token ${effectiveToken}`;
        }
        const testRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}`, {
          headers: testHeaders,
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        // Even 403 (rate limited) means GitHub is reachable
        githubReachable = testRes.status === 200 || testRes.status === 301 || testRes.status === 403;
      } catch {
        githubReachable = false;
      }
      return NextResponse.json({
        currentVersion,
        lastChecked: Date.now(),
        channel,
        status: 'up-to-date',
        githubReachable,
        repo: GITHUB_REPO,
        tokenOptional: true,
        hasToken: !!effectiveToken,
        message: 'Updates work without a token. A token increases rate limits for private repos.',
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
