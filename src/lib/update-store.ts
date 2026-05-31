'use client';

import { create } from 'zustand';

// ─── Update Types ───

export type UpdateType = 'feature' | 'fix' | 'security' | 'performance';

export type UpdateStatus = 'available' | 'downloading' | 'installing' | 'installed' | 'failed';

export type UpdateChannel = 'stable' | 'beta' | 'nightly';

export interface UpdateEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  type: UpdateType;
  status: UpdateStatus;
  size: number; // in bytes
  changelog: string;
  timestamp: number;
  commitHash: string;
  progress?: number; // 0-100 for download/install progress
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoInstall: boolean;
  checkInterval: number; // minutes
  channel: UpdateChannel;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  html_url: string;
}

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
  };
  zipball_url: string;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: UpdateEntry[];
  latestVersion: string;
  currentVersion: string;
}

// ─── Store Interface ───

interface UpdateState {
  // State
  availableUpdates: UpdateEntry[];
  installedUpdates: UpdateEntry[];
  updateSettings: UpdateSettings;
  isChecking: boolean;
  isInstalling: boolean;
  lastChecked: number;
  currentVersion: string;
  installProgress: Record<string, number>; // update id -> progress percentage

  // Actions
  checkForUpdates: () => Promise<void>;
  installUpdate: (id: string) => Promise<void>;
  installAllUpdates: () => Promise<void>;
  rollbackUpdate: (id: string) => Promise<void>;
  setUpdateSettings: (settings: Partial<UpdateSettings>) => void;
  setUpdateStatus: (id: string, status: UpdateStatus, progress?: number) => void;
}

// ─── Helper Functions ───

function parseUpdateType(message: string): UpdateType {
  const lower = message.toLowerCase();
  if (lower.includes('security') || lower.includes('vuln') || lower.includes('cve')) return 'security';
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch') || lower.includes('hotfix')) return 'fix';
  if (lower.includes('perf') || lower.includes('optim') || lower.includes('speed') || lower.includes('fast')) return 'performance';
  return 'feature';
}

function generateChangelog(commits: GitHubCommit[]): string {
  return commits
    .map(c => `- ${c.commit.message.split('\n')[0]}`)
    .join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── Seed installed updates for demo ───

const SEED_INSTALLED_UPDATES: UpdateEntry[] = [
  {
    id: 'upd-seed-1',
    version: '0.1.9',
    title: 'Agent Orchestration Improvements',
    description: 'Enhanced multi-agent routing with improved latency and reliability across all 7 layers.',
    type: 'performance',
    status: 'installed',
    size: 245760,
    changelog: '- Optimized routing table refresh\n- Reduced agent-to-agent latency by 34%\n- Added circuit breaker for reasoning chains',
    timestamp: Date.now() - 86400000 * 3,
    commitHash: 'a1b2c3d',
  },
  {
    id: 'upd-seed-2',
    version: '0.1.8',
    title: 'Memory Layer Security Patch',
    description: 'Critical security update for the Memory vault access control system.',
    type: 'security',
    status: 'installed',
    size: 81920,
    changelog: '- Fixed access control bypass in vault sharing\n- Added PII detection for memory entries\n- Encrypted memory transport between agents',
    timestamp: Date.now() - 86400000 * 7,
    commitHash: 'e4f5g6h',
  },
  {
    id: 'upd-seed-3',
    version: '0.1.7',
    title: 'Hermes Skills Registry v2',
    description: 'Expanded skill registry with 500+ new capabilities and improved search.',
    type: 'feature',
    status: 'installed',
    size: 512000,
    changelog: '- Added 500+ new skills\n- Improved skill search relevance\n- Added skill versioning support',
    timestamp: Date.now() - 86400000 * 14,
    commitHash: 'i7j8k9l',
  },
];

// ─── Store ───

export const useUpdateStore = create<UpdateState>((set, get) => ({
  availableUpdates: [],
  installedUpdates: SEED_INSTALLED_UPDATES,
  updateSettings: {
    autoCheck: true,
    autoInstall: false,
    checkInterval: 30,
    channel: 'stable' as UpdateChannel,
  },
  isChecking: false,
  isInstalling: false,
  lastChecked: 0,
  currentVersion: '0.2.0',
  installProgress: {},

  checkForUpdates: async () => {
    const state = get();
    if (state.isChecking) return;

    set({ isChecking: true });

    try {
      const response = await fetch('/api/updates?action=check');
      if (!response.ok) throw new Error('Failed to check for updates');

      const data: UpdateCheckResult = await response.json();

      // Mark updates that are already installed as not available
      const installedVersions = new Set(state.installedUpdates.map(u => u.version));
      const newAvailable = data.updates.filter(u => !installedVersions.has(u.version));

      set({
        availableUpdates: newAvailable,
        lastChecked: Date.now(),
        isChecking: false,
      });

      // Auto-install if enabled
      if (state.updateSettings.autoInstall && newAvailable.length > 0) {
        // Queue auto-install
        for (const update of newAvailable) {
          await get().installUpdate(update.id);
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      set({ isChecking: false });
    }
  },

  installUpdate: async (id: string) => {
    const state = get();
    if (state.isInstalling) return;

    const update = state.availableUpdates.find(u => u.id === id);
    if (!update) return;

    set({ isInstalling: true });

    // Simulate download progress
    set((prev) => ({
      availableUpdates: prev.availableUpdates.map(u =>
        u.id === id ? { ...u, status: 'downloading' as UpdateStatus, progress: 0 } : u
      ),
      installProgress: { ...prev.installProgress, [id]: 0 },
    }));

    // Simulate download with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      set((prev) => ({
        availableUpdates: prev.availableUpdates.map(u =>
          u.id === id ? { ...u, progress: i } : u
        ),
        installProgress: { ...prev.installProgress, [id]: i },
      }));
    }

    // Simulate install
    set((prev) => ({
      availableUpdates: prev.availableUpdates.map(u =>
        u.id === id ? { ...u, status: 'installing' as UpdateStatus, progress: 0 } : u
      ),
      installProgress: { ...prev.installProgress, [id]: 0 },
    }));

    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 200));
      set((prev) => ({
        availableUpdates: prev.availableUpdates.map(u =>
          u.id === id ? { ...u, progress: i } : u
        ),
        installProgress: { ...prev.installProgress, [id]: i },
      }));
    }

    // Mark as installed
    const installedUpdate = { ...update, status: 'installed' as UpdateStatus, progress: 100 };

    set((prev) => ({
      availableUpdates: prev.availableUpdates.filter(u => u.id !== id),
      installedUpdates: [installedUpdate, ...prev.installedUpdates],
      isInstalling: false,
      installProgress: { ...prev.installProgress, [id]: 100 },
      currentVersion: update.version,
    }));

    // Clear progress after a delay
    setTimeout(() => {
      set((prev) => {
        const newProgress = { ...prev.installProgress };
        delete newProgress[id];
        return { installProgress: newProgress };
      });
    }, 2000);
  },

  installAllUpdates: async () => {
    const state = get();
    const available = [...state.availableUpdates];

    for (const update of available) {
      await get().installUpdate(update.id);
    }
  },

  rollbackUpdate: async (id: string) => {
    const state = get();
    const update = state.installedUpdates.find(u => u.id === id);
    if (!update) return;

    // Simulate rollback
    set((prev) => ({
      installedUpdates: prev.installedUpdates.map(u =>
        u.id === id ? { ...u, status: 'available' as UpdateStatus } : u
      ),
    }));

    // Move back to available after short delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const rolledBackUpdate = { ...update, status: 'available' as UpdateStatus, progress: undefined };

    set((prev) => ({
      installedUpdates: prev.installedUpdates.filter(u => u.id !== id),
      availableUpdates: [rolledBackUpdate, ...prev.availableUpdates],
      currentVersion: prev.installedUpdates.find(u => u.id !== id)?.version || prev.currentVersion,
    }));
  },

  setUpdateSettings: (settings: Partial<UpdateSettings>) => {
    set((prev) => ({
      updateSettings: { ...prev.updateSettings, ...settings },
    }));
  },

  setUpdateStatus: (id: string, status: UpdateStatus, progress?: number) => {
    set((prev) => ({
      availableUpdates: prev.availableUpdates.map(u =>
        u.id === id ? { ...u, status, progress } : u
      ),
    }));
  },
}));

// Export helper for use outside React
export { formatBytes, parseUpdateType, generateChangelog };
