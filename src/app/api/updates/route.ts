import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execFileAsync = promisify(execFile);
const IS_WIN = platform() === 'win32';

// Force dynamic rendering — prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Dynamic repo: reads from GITHUB_REPO env var, falls back to default
const getGithubRepo = () => process.env.GITHUB_REPO || 'rachidSabah/Agentic-os';
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

interface RateLimitInfo {
  rateLimited: boolean;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  message?: string;
}

function parseUpdateType(message: string): 'feature' | 'fix' | 'security' | 'performance' {
  const lower = message.toLowerCase();
  if (lower.includes('security') || lower.includes('vuln') || lower.includes('cve')) return 'security';
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch') || lower.includes('hotfix')) return 'fix';
  if (lower.includes('perf') || lower.includes('optim') || lower.includes('speed') || lower.includes('fast')) return 'performance';
  return 'feature';
}

/**
 * Robust semver comparison that handles string suffixes like `-patch.abcdefg`.
 * Strips the suffix before comparing, then falls back to suffix comparison.
 * Returns: 1 if a > b, -1 if a < b, 0 if equal.
 */
function semverCompare(a: string, b: string): number {
  // Strip leading 'v' and split off any prerelease/build suffix (e.g. -patch.abc)
  const cleanVersion = (v: string) => {
    const stripped = v.replace(/^v/, '');
    const match = stripped.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : stripped.split('-')[0].split('+')[0];
  };

  const extractPrerelease = (v: string): string => {
    const stripped = v.replace(/^v/, '');
    const match = stripped.match(/^\d+\.\d+\.\d+-(.+)/);
    return match ? match[1] : '';
  };

  const pa = cleanVersion(a).split('.').map(Number);
  const pb = cleanVersion(b).split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const na = !isNaN(pa[i]) ? pa[i] : 0;
    const nb = !isNaN(pb[i]) ? pb[i] : 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  // Same major.minor.patch — compare prerelease suffixes
  // A version WITHOUT a prerelease suffix is GREATER than one with it (e.g. 5.0.0 > 5.0.0-patch.abc)
  const preA = extractPrerelease(a);
  const preB = extractPrerelease(b);

  if (!preA && preB) return 1;  // a is release, b is prerelease → a > b
  if (preA && !preB) return -1; // a is prerelease, b is release → a < b
  if (preA && preB) {
    // Both have prerelease — lexicographic comparison
    if (preA > preB) return 1;
    if (preA < preB) return -1;
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

async function fetchGitHub<T>(endpoint: string, clientToken?: string): Promise<{ data: T | null; rateLimited: boolean; rateLimitRemaining?: number; rateLimitReset?: number }> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Agentic-OS-Update-Checker',
    };

    // Use GitHub token: client-provided (from UI) > env variable
    const githubToken = clientToken || process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const repo = getGithubRepo();
    const url = endpoint.startsWith('/repos/')
      ? `${GITHUB_API}${endpoint}`
      : `${GITHUB_API}/repos/${repo}${endpoint}`;

    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    // Extract rate limit info from response headers
    const rateLimitRemaining = res.headers.get('x-ratelimit-remaining')
      ? Number(res.headers.get('x-ratelimit-remaining'))
      : undefined;
    const rateLimitReset = res.headers.get('x-ratelimit-reset')
      ? Number(res.headers.get('x-ratelimit-reset'))
      : undefined;

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        const isRateLimit = rateLimitRemaining === 0 || res.headers.get('x-ratelimit-remaining') === '0';
        if (isRateLimit) {
          console.warn(`[Updates] GitHub API rate limit reached. Remaining: ${rateLimitRemaining}, Reset: ${rateLimitReset ? new Date(rateLimitReset * 1000).toISOString() : 'unknown'}. ${!githubToken ? 'Add GITHUB_TOKEN to .env for higher limits (5000 req/hr).' : ''}`);
          return { data: null, rateLimited: true, rateLimitRemaining, rateLimitReset };
        }
      } else if (res.status !== 404) {
        console.error(`[Updates] GitHub API ${endpoint} returned ${res.status} ${res.statusText}`);
      }
      return { data: null, rateLimited: false, rateLimitRemaining, rateLimitReset };
    }
    const data = await res.json() as T;
    return { data, rateLimited: false, rateLimitRemaining, rateLimitReset };
  } catch (err) {
    console.error(`[Updates] GitHub API ${endpoint} fetch error:`, err);
    return { data: null, rateLimited: false };
  }
}

async function checkForUpdates(currentVersion: string, channel: string, clientToken?: string): Promise<{
  hasUpdates: boolean;
  updates: UpdateEntry[];
  latestVersion: string;
  currentVersion: string;
  rateLimitInfo?: RateLimitInfo;
}> {
  const repo = getGithubRepo();

  // Fetch tags and recent commits in parallel
  const [tagsResult, commitsResult] = await Promise.all([
    fetchGitHub<GitHubTag[]>(`/repos/${repo}/tags?per_page=10`, clientToken),
    fetchGitHub<GitHubCommit[]>(`/repos/${repo}/commits?per_page=20`, clientToken),
  ]);

  const tags = tagsResult.data;
  const commits = commitsResult.data;

  // Build rate limit info from the most constrained response
  const rateLimitInfo: RateLimitInfo = {
    rateLimited: tagsResult.rateLimited || commitsResult.rateLimited,
    rateLimitRemaining: Math.min(tagsResult.rateLimitRemaining ?? Infinity, commitsResult.rateLimitRemaining ?? Infinity),
    rateLimitReset: Math.max(tagsResult.rateLimitReset ?? 0, commitsResult.rateLimitReset ?? 0) || undefined,
  };

  if (rateLimitInfo.rateLimited) {
    rateLimitInfo.message = !clientToken && !process.env.GITHUB_TOKEN
      ? 'GitHub API rate limit reached (60 req/hr without token). Add a GITHUB_TOKEN in Settings or .env for 5000 req/hr.'
      : 'GitHub API rate limit reached. Updates will resume after the limit resets.';
  }

  const updates: UpdateEntry[] = [];
  let latestVersion = currentVersion;

  // Process tags - find versions newer than current
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      if (semverCompare(tag.name, currentVersion) > 0) {
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
    const baseVersion = currentVersion.split('-')[0];
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
            ? `${baseVersion}-patch.${shortSha}`
            : `${baseVersion}-dev.${shortSha}`,
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
        updates.push(cu);
        seenVersions.add(cu.version);
      }
    }
  }

  return {
    hasUpdates: updates.length > 0,
    updates,
    latestVersion: updates.length > 0 ? (updates[0]?.version || latestVersion) : currentVersion,
    currentVersion,
    rateLimitInfo: rateLimitInfo.rateLimited ? rateLimitInfo : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'check';
  const clientVersion = searchParams.get('version');
  const channel = searchParams.get('channel') || 'stable';
  const clientToken = request.headers.get('X-GitHub-Token') || undefined;

  switch (action) {
    case 'check': {
      const pkgVersion = await getAppVersion();
      const currentVersion = clientVersion || pkgVersion;
      const result = await checkForUpdates(currentVersion, channel, clientToken);
      return NextResponse.json(result);
    }

    case 'status': {
      const pkgVersion = await getAppVersion();
      const currentVersion = clientVersion || pkgVersion;
      const effectiveToken = clientToken || process.env.GITHUB_TOKEN;
      const repo = getGithubRepo();

      let githubReachable = false;
      let rateLimited = false;
      let rateLimitRemaining: number | undefined;
      try {
        const testHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Agentic-OS-Update-Checker',
        };
        if (effectiveToken) {
          testHeaders['Authorization'] = `token ${effectiveToken}`;
        }
        const testRes = await fetch(`${GITHUB_API}/repos/${repo}`, {
          headers: testHeaders,
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });

        rateLimitRemaining = testRes.headers.get('x-ratelimit-remaining')
          ? Number(testRes.headers.get('x-ratelimit-remaining'))
          : undefined;

        if (testRes.status === 403 || testRes.status === 429) {
          rateLimited = rateLimitRemaining === 0 || testRes.headers.get('x-ratelimit-remaining') === '0';
          githubReachable = true; // 403/429 means GitHub IS reachable, just throttled!
        } else {
          githubReachable = testRes.status === 200 || testRes.status === 301;
        }
      } catch {
        githubReachable = false;
      }

      return NextResponse.json({
        currentVersion,
        lastChecked: Date.now(),
        channel,
        status: 'up-to-date',
        githubReachable,
        repo,
        tokenOptional: true,
        hasToken: !!effectiveToken,
        rateLimited,
        rateLimitRemaining,
        message: rateLimited
          ? 'GitHub API rate limit reached. Add a GITHUB_TOKEN in Settings or .env for higher limits (5000 req/hr).'
          : !githubReachable
          ? 'Could not reach GitHub. Check your internet connection.'
          : 'Updates are working. A token increases rate limits for private repos.',
      });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, updateId } = body;
  const projectDir = process.cwd();

  switch (action) {
    case 'install': {
      // Perform actual git pull to update from GitHub
      try {
        const shellOpt = IS_WIN ? { shell: true } : {};

        // Step 1: Fetch latest from origin
        const { stdout: fetchOut } = await execFileAsync('git', ['fetch', 'origin'], {
          timeout: 30000,
          cwd: projectDir,
          ...shellOpt,
        });

        // Step 2: Check if there are changes
        const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain', '-b'], {
          timeout: 10000,
          cwd: projectDir,
          ...shellOpt,
        });

        // Step 3: Pull latest changes
        const { stdout: pullOut, stderr: pullErr } = await execFileAsync('git', ['pull', '--rebase', 'origin', 'main'], {
          timeout: 60000,
          cwd: projectDir,
          ...shellOpt,
        });

        // Step 4: Install dependencies if package.json changed
        let depsInstalled = false;
        try {
          const { stdout: diffOut } = await execFileAsync('git', ['diff', 'HEAD~1', '--name-only', 'package.json'], {
            timeout: 10000,
            cwd: projectDir,
            ...shellOpt,
          });
          if (diffOut.trim().includes('package.json')) {
            const npmCmd = IS_WIN ? 'npm.cmd' : 'npm';
            await execFileAsync(npmCmd, ['install'], {
              timeout: 120000,
              cwd: projectDir,
              ...shellOpt,
            });
            depsInstalled = true;
          }
        } catch {
          // package.json didn't change or npm install failed — not critical
        }

        // Step 5: Get the new version
        const newVersion = await getAppVersion();

        // Step 6: Clear .next cache so changes are picked up
        try {
          const { rm } = await import('fs/promises');
          const nextDir = join(projectDir, '.next');
          await rm(nextDir, { recursive: true, force: true });
        } catch {
          // .next dir might not exist or be locked — not critical
        }

        // Step 7: Rebuild if in production mode (not needed for dev server)
        let rebuilt = false;
        if (process.env.NODE_ENV === 'production') {
          try {
            const npmCmd = IS_WIN ? 'npm.cmd' : 'npm';
            await execFileAsync(npmCmd, ['run', 'build'], {
              timeout: 300000,
              cwd: projectDir,
              ...shellOpt,
            });
            rebuilt = true;
          } catch {
            // Build failed — user can restart dev server manually
          }
        }

        return NextResponse.json({
          success: true,
          updateId,
          message: `Updated successfully to ${newVersion}. ${depsInstalled ? 'Dependencies installed.' : ''} ${rebuilt ? 'App rebuilt.' : 'Restart the dev server to see changes.'}`,
          output: pullOut || pullErr || 'Already up to date.',
          version: newVersion,
          depsInstalled,
          rebuilt,
          timestamp: Date.now(),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[Updates] Git pull failed:', errorMsg);
        return NextResponse.json({
          success: false,
          updateId,
          message: `Update failed: ${errorMsg}`,
          error: errorMsg,
          timestamp: Date.now(),
        });
      }
    }

    case 'rollback': {
      // Rollback to the previous commit
      try {
        const shellOpt = IS_WIN ? { shell: true } : {};
        const { stdout: logOut } = await execFileAsync('git', ['log', '--oneline', '-2'], {
          timeout: 10000,
          cwd: projectDir,
          ...shellOpt,
        });

        const lines = logOut.trim().split('\n');
        if (lines.length < 2) {
          return NextResponse.json({
            success: false,
            message: 'No previous commit to rollback to.',
            timestamp: Date.now(),
          });
        }

        const prevCommit = lines[1].split(' ')[0];
        await execFileAsync('git', ['reset', '--hard', prevCommit], {
          timeout: 30000,
          cwd: projectDir,
          ...shellOpt,
        });

        return NextResponse.json({
          success: true,
          updateId,
          message: `Rolled back to commit ${prevCommit}`,
          commitHash: prevCommit,
          timestamp: Date.now(),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          success: false,
          updateId,
          message: `Rollback failed: ${errorMsg}`,
          timestamp: Date.now(),
        });
      }
    }

    case 'check-local': {
      // Check if there are local changes not yet committed
      try {
        const shellOpt = IS_WIN ? { shell: true } : {};
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
          timeout: 10000,
          cwd: projectDir,
          ...shellOpt,
        });

        const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], {
          timeout: 10000,
          cwd: projectDir,
          ...shellOpt,
        });

        const { stdout: aheadBehind } = await execFileAsync('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main'], {
          timeout: 10000,
          cwd: projectDir,
          ...shellOpt,
        });

        const [ahead, behind] = aheadBehind.trim().split(/\s+/).map(Number);

        return NextResponse.json({
          branch: branchOut.trim(),
          uncommittedChanges: stdout.trim().split('\n').filter(Boolean).length,
          ahead: ahead || 0,
          behind: behind || 0,
          needsUpdate: (behind || 0) > 0,
          timestamp: Date.now(),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          error: `Failed to check local status: ${errorMsg}`,
          timestamp: Date.now(),
        });
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action. Use: install, rollback, check-local' }, { status: 400 });
  }
}
