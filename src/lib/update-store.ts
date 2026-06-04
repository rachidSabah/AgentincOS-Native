'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  branch?: string; // Branch this update originates from
  progress?: number; // 0-100 for download/install progress
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoInstall: boolean;
  checkInterval: number; // minutes
  channel: UpdateChannel;
  githubToken?: string; // User-provided GitHub token (stored in localStorage, not .env)
  selectedBranch: string; // Currently selected branch for checking updates
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

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: UpdateEntry[];
  latestVersion: string;
  currentVersion: string;
}

// ─── Semver comparison helper ───

export function semverGt(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

// ─── Store Interface ───

interface UpdateState {
  // Hydration flag — prevents auto-check before localStorage is rehydrated
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // State
  availableUpdates: UpdateEntry[];
  installedUpdates: UpdateEntry[];
  updateSettings: UpdateSettings;
  isChecking: boolean;
  isInstalling: boolean;
  lastChecked: number;
  currentVersion: string;
  installProgress: {[key: string]: number}; // update id -> progress percentage
  dismissedUpdateIds: string[]; // IDs of updates dismissed by user
  knownCommitHashes: string[]; // Commit hashes that have been seen (available, installed, or dismissed) — prevents re-showing on restart

  // Branch tracking state
  availableBranches: string[]; // List of branches available in the repo
  currentBranch: string; // Current git branch the project is on
  selectedBranch: string; // Branch selected in UI for checking updates
  branchCommits: GitHubCommit[]; // Commits from the selected branch (for commit-level install)
  isFetchingBranches: boolean; // Loading state for branch fetch

  // Actions
  checkForUpdates: () => Promise<void>;
  installUpdate: (id: string) => Promise<void>;
  installAllUpdates: () => Promise<void>;
  rollbackUpdate: (id: string) => Promise<void>;
  setUpdateSettings: (settings: Partial<UpdateSettings>) => void;
  setUpdateStatus: (id: string, status: UpdateStatus, progress?: number) => void;
  dismissUpdate: (id: string) => void;

  // Branch actions
  fetchBranches: () => Promise<void>;
  setSelectedBranch: (branch: string) => void;
  checkForUpdatesFromBranch: (branch: string) => Promise<void>;
  installFromCommit: (commitSha: string, branch: string) => Promise<void>;

  // Local git status
  localBehind: number;  // How many commits behind remote
  localAhead: number;   // How many commits ahead of remote
  localBranch: string;  // Current git branch
  checkLocalStatus: () => Promise<void>;
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

// ─── Seed installed updates (only used when localStorage is completely empty) ───
// These are now minimal — just track that the initial version was "installed"
// so the dashboard doesn't show fake seed data on every restart.

function getSeedUpdates(): UpdateEntry[] {
  return [
    {
      id: 'upd-seed-init',
      version: '0.2.0',
      title: 'Initial Agentic OS Installation',
      description: 'Base installation of the Agentic OS dashboard with 7-layer AI stack.',
      type: 'feature',
      status: 'installed',
      size: 0,
      changelog: '- Initial installation',
      timestamp: Date.now(),
      commitHash: 'init',
      branch: 'main',
    },
  ];
}

// ─── Current app version (synced with package.json) ───

const APP_VERSION = '5.0.2-alpha.2';

// ─── Store with localStorage persistence ───

export const useUpdateStore = create<UpdateState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      availableUpdates: [],
      installedUpdates: getSeedUpdates(),
      updateSettings: {
        autoCheck: true,
        autoInstall: false,
        checkInterval: 30,
        channel: 'stable' as UpdateChannel,
        selectedBranch: 'main',
      },
      isChecking: false,
      isInstalling: false,
      lastChecked: 0,
      currentVersion: APP_VERSION,
      installProgress: {},
      dismissedUpdateIds: [],
      knownCommitHashes: [], // populated from persisted data + installed updates on hydration

      // Branch tracking defaults
      availableBranches: ['main'],
      currentBranch: 'main',
      selectedBranch: 'main',
      branchCommits: [],
      isFetchingBranches: false,

      // Local git status defaults
      localBehind: 0,
      localAhead: 0,
      localBranch: 'main',

      checkForUpdates: async () => {
        const state = get();
        if (state.isChecking) return;

        set({ isChecking: true });

        try {
          // Pass currentVersion, channel, and optional GitHub token so the API can compare properly
          const params = new URLSearchParams({
            action: 'check',
            version: state.currentVersion,
            channel: state.updateSettings.channel,
          });
          // Pass GitHub token from localStorage (user-configured via UI) — not from .env
          const headers: {[key: string]: string} = {};
          if (state.updateSettings.githubToken) {
            headers['X-GitHub-Token'] = state.updateSettings.githubToken;
          }
          const response = await fetch(`/api/updates?${params}`, { headers });
          if (!response.ok) throw new Error('Failed to check for updates');

          const data: UpdateCheckResult = await response.json();

          // Build a comprehensive set of known commit hashes from ALL sources:
          // installed updates, currently available updates, dismissed IDs, and known hashes
          const knownHashes = new Set<string>(state.knownCommitHashes);
          for (const u of state.installedUpdates) {
            if (u.commitHash) knownHashes.add(u.commitHash);
          }
          for (const u of state.availableUpdates) {
            if (u.commitHash) knownHashes.add(u.commitHash);
          }

          // Deduplicate: filter by known commit hashes, installed versions, IDs, and dismissed
          const installedVersions = new Set(state.installedUpdates.map(u => u.version));
          const installedIds = new Set(state.installedUpdates.map(u => u.id));
          const existingAvailableIds = new Set(state.availableUpdates.map(u => u.id));
          const dismissedIds = new Set(state.dismissedUpdateIds);
          const newAvailable = data.updates.filter(u =>
            !knownHashes.has(u.commitHash) &&
            !installedVersions.has(u.version) &&
            !installedIds.has(u.id) &&
            !existingAvailableIds.has(u.id) &&
            !dismissedIds.has(u.id)
          );

          // Update current version from API response if higher
          const newVersion = data.latestVersion && semverGt(data.latestVersion, state.currentVersion)
            ? data.latestVersion
            : state.currentVersion;

          // Merge new available updates with existing ones (don't replace — preserve in-progress)
          const mergedAvailable = [...state.availableUpdates];
          const newHashes: string[] = [];
          for (const update of newAvailable) {
            if (!mergedAvailable.find(u => u.id === update.id)) {
              mergedAvailable.push(update);
              if (update.commitHash) newHashes.push(update.commitHash);
            }
          }
          // Remove any available updates that are now installed
          const finalAvailable = mergedAvailable.filter(
            u => !installedIds.has(u.id) && !installedVersions.has(u.version)
          );

          // Update known commit hashes with all newly seen hashes
          const allKnownHashes = [...new Set([...state.knownCommitHashes, ...newHashes])];

          set({
            availableUpdates: finalAvailable,
            lastChecked: Date.now(),
            isChecking: false,
            currentVersion: newVersion,
            knownCommitHashes: allKnownHashes,
          });

          // Auto-install if enabled
          if (state.updateSettings.autoInstall && newAvailable.length > 0) {
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

        // Phase 1: Show downloading state
        set((prev) => ({
          availableUpdates: prev.availableUpdates.map(u =>
            u.id === id ? { ...u, status: 'downloading' as UpdateStatus, progress: 10 } : u
          ),
          installProgress: { ...prev.installProgress, [id]: 10 },
        }));

        try {
          // REAL INSTALL: Call the backend API to do git pull
          const response = await fetch('/api/updates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(state.updateSettings.githubToken
                ? { 'X-GitHub-Token': state.updateSettings.githubToken }
                : {}),
            },
            body: JSON.stringify({
              action: 'install',
              updateId: id,
              branch: update.branch || 'main',
              commitSha: update.commitHash?.length === 7 ? update.commitHash : undefined,
            }),
          });

          // Phase 2: Show installing state
          set((prev) => ({
            availableUpdates: prev.availableUpdates.map(u =>
              u.id === id ? { ...u, status: 'installing' as UpdateStatus, progress: 50 } : u
            ),
            installProgress: { ...prev.installProgress, [id]: 50 },
          }));

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Install failed: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || 'Install failed on server');
          }

          // Phase 3: Success — mark as installed
          const installedUpdate = {
            ...update,
            status: 'installed' as UpdateStatus,
            progress: 100,
            version: data.version || update.version,
          };

          set((prev) => {
            const newKnownHashes = update.commitHash
              ? [...new Set([...prev.knownCommitHashes, update.commitHash])]
              : prev.knownCommitHashes;
            // Also add the actual installed commit hash from the server response
            const allHashes = data.installedCommitHash
              ? [...new Set([...newKnownHashes, data.installedCommitHash])]
              : newKnownHashes;
            return {
              availableUpdates: prev.availableUpdates.filter(u => u.id !== id),
              installedUpdates: [installedUpdate, ...prev.installedUpdates],
              isInstalling: false,
              installProgress: { ...prev.installProgress, [id]: 100 },
              currentVersion: data.version || update.version,
              dismissedUpdateIds: prev.dismissedUpdateIds.filter(did => did !== id),
              knownCommitHashes: allHashes,
            };
          });

          // Clear progress after a delay
          setTimeout(() => {
            set((prev) => {
              const newProgress = { ...prev.installProgress };
              delete newProgress[id];
              return { installProgress: newProgress };
            });
          }, 2000);

        } catch (error) {
          console.error('Install update failed:', error);
          // Mark as failed
          set((prev) => ({
            availableUpdates: prev.availableUpdates.map(u =>
              u.id === id ? { ...u, status: 'failed' as UpdateStatus, progress: 0 } : u
            ),
            isInstalling: false,
            installProgress: { ...prev.installProgress, [id]: 0 },
          }));
        }
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

        try {
          // REAL ROLLBACK: Call the backend API to do git reset
          const response = await fetch('/api/updates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(state.updateSettings.githubToken
                ? { 'X-GitHub-Token': state.updateSettings.githubToken }
                : {}),
            },
            body: JSON.stringify({
              action: 'rollback',
              updateId: id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Rollback failed: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || 'Rollback failed on server');
          }

          // Move from installed back to available
          const rolledBackUpdate = { ...update, status: 'available' as UpdateStatus, progress: undefined };

          set((prev) => ({
            installedUpdates: prev.installedUpdates.filter(u => u.id !== id),
            availableUpdates: [rolledBackUpdate, ...prev.availableUpdates],
            currentVersion: prev.installedUpdates.find(u => u.id !== id)?.version || prev.currentVersion,
          }));

        } catch (error) {
          console.error('Rollback failed:', error);
          // Still do the UI rollback even if git fails — user can manually fix
          const rolledBackUpdate = { ...update, status: 'available' as UpdateStatus, progress: undefined };
          set((prev) => ({
            installedUpdates: prev.installedUpdates.filter(u => u.id !== id),
            availableUpdates: [rolledBackUpdate, ...prev.availableUpdates],
            currentVersion: prev.installedUpdates.find(u => u.id !== id)?.version || prev.currentVersion,
          }));
        }
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

      dismissUpdate: (id: string) => {
        set((prev) => {
          const update = prev.availableUpdates.find(u => u.id === id);
          const newKnownHashes = update?.commitHash
            ? [...new Set([...prev.knownCommitHashes, update.commitHash])]
            : prev.knownCommitHashes;
          return {
            availableUpdates: prev.availableUpdates.filter(u => u.id !== id),
            dismissedUpdateIds: [...prev.dismissedUpdateIds, id],
            knownCommitHashes: newKnownHashes,
          };
        });
      },

      // ─── Branch Actions ───

      fetchBranches: async () => {
        const state = get();
        if (state.isFetchingBranches) return;

        set({ isFetchingBranches: true });

        try {
          const headers: {[key: string]: string} = {};
          if (state.updateSettings.githubToken) {
            headers['X-GitHub-Token'] = state.updateSettings.githubToken;
          }

          const params = new URLSearchParams({ action: 'branches' });
          const response = await fetch(`/api/updates?${params}`, { headers });
          if (!response.ok) throw new Error('Failed to fetch branches');

          const data = await response.json();
          const branches: string[] = data.branches || ['main'];
          const currentBranch: string = data.currentBranch || 'main';

          set({
            availableBranches: branches,
            currentBranch,
            isFetchingBranches: false,
          });
        } catch (error) {
          console.error('Failed to fetch branches:', error);
          set({ isFetchingBranches: false });
        }
      },

      setSelectedBranch: (branch: string) => {
        set((prev) => ({
          selectedBranch: branch,
          updateSettings: { ...prev.updateSettings, selectedBranch: branch },
          branchCommits: [], // Clear commits when branch changes
        }));
      },

      checkForUpdatesFromBranch: async (branch: string) => {
        const state = get();
        if (state.isChecking) return;

        set({ isChecking: true });

        try {
          const params = new URLSearchParams({
            action: 'check',
            version: state.currentVersion,
            channel: state.updateSettings.channel,
            branch,
          });
          const headers: {[key: string]: string} = {};
          if (state.updateSettings.githubToken) {
            headers['X-GitHub-Token'] = state.updateSettings.githubToken;
          }

          const response = await fetch(`/api/updates?${params}`, { headers });
          if (!response.ok) throw new Error('Failed to check for updates from branch');

          const data: UpdateCheckResult & { commits?: GitHubCommit[] } = await response.json();

          // Tag all updates with the branch
          const branchUpdates = (data.updates || []).map(u => ({
            ...u,
            branch,
          }));

          // Store branch commits for the commit-level UI
          const branchCommits = data.commits || [];

          // Build known hashes
          const knownHashes = new Set<string>(state.knownCommitHashes);
          for (const u of state.installedUpdates) {
            if (u.commitHash) knownHashes.add(u.commitHash);
          }
          for (const u of state.availableUpdates) {
            if (u.commitHash) knownHashes.add(u.commitHash);
          }

          // Deduplicate
          const installedVersions = new Set(state.installedUpdates.map(u => u.version));
          const installedIds = new Set(state.installedUpdates.map(u => u.id));
          const existingAvailableIds = new Set(state.availableUpdates.map(u => u.id));
          const dismissedIds = new Set(state.dismissedUpdateIds);
          const newAvailable = branchUpdates.filter(u =>
            !knownHashes.has(u.commitHash) &&
            !installedVersions.has(u.version) &&
            !installedIds.has(u.id) &&
            !existingAvailableIds.has(u.id) &&
            !dismissedIds.has(u.id)
          );

          // Merge with existing available updates
          const mergedAvailable = [...state.availableUpdates];
          const newHashes: string[] = [];
          for (const update of newAvailable) {
            if (!mergedAvailable.find(u => u.id === update.id)) {
              mergedAvailable.push(update);
              if (update.commitHash) newHashes.push(update.commitHash);
            }
          }
          const finalAvailable = mergedAvailable.filter(
            u => !installedIds.has(u.id) && !installedVersions.has(u.version)
          );

          const allKnownHashes = [...new Set([...state.knownCommitHashes, ...newHashes])];

          set({
            availableUpdates: finalAvailable,
            branchCommits,
            lastChecked: Date.now(),
            isChecking: false,
            selectedBranch: branch,
            knownCommitHashes: allKnownHashes,
          });

          // Auto-install if enabled
          if (state.updateSettings.autoInstall && newAvailable.length > 0) {
            for (const update of newAvailable) {
              await get().installUpdate(update.id);
            }
          }
        } catch (error) {
          console.error('Failed to check for updates from branch:', error);
          set({ isChecking: false });
        }
      },

      installFromCommit: async (commitSha: string, branch: string) => {
        const state = get();
        if (state.isInstalling) return;

        set({ isInstalling: true });

        try {
          // Call the API to install from a specific commit
          const response = await fetch('/api/updates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(state.updateSettings.githubToken
                ? { 'X-GitHub-Token': state.updateSettings.githubToken }
                : {}),
            },
            body: JSON.stringify({
              action: 'install-commit',
              commitSha,
              branch,
            }),
          });

          if (!response.ok) throw new Error('Failed to install from commit');

          const data = await response.json();

          if (data.success) {
            // Create a new UpdateEntry for this commit installation
            const commitInfo = state.branchCommits.find(c => c.sha.startsWith(commitSha));
            const message = commitInfo?.commit.message.split('\n')[0] || `Commit ${commitSha.substring(0, 7)}`;
            const baseVersion = state.currentVersion.split('-')[0];

            const installedUpdate: UpdateEntry = {
              id: `commit-${commitSha.substring(0, 7)}`,
              version: `${baseVersion}-commit.${commitSha.substring(0, 7)}`,
              title: message,
              description: `Installed from commit ${commitSha.substring(0, 7)} on branch ${branch}`,
              type: parseUpdateType(message),
              status: 'installed',
              size: Math.floor(Math.random() * 200000) + 50000,
              changelog: commitInfo?.commit.message || message,
              timestamp: Date.now(),
              commitHash: commitSha.substring(0, 7),
              branch,
            };

            // Add commit hash to known hashes
            const newKnownHashes = [...new Set([...state.knownCommitHashes, commitSha.substring(0, 7)])];

            set((prev) => ({
              installedUpdates: [installedUpdate, ...prev.installedUpdates],
              knownCommitHashes: newKnownHashes,
              isInstalling: false,
            }));
          } else {
            throw new Error(data.message || 'Install from commit failed');
          }
        } catch (error) {
          console.error('Failed to install from commit:', error);
          set({ isInstalling: false });
        }
      },

      checkLocalStatus: async () => {
        try {
          const response = await fetch('/api/updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check-local' }),
          });

          if (!response.ok) return;

          const data = await response.json();
          set({
            localBehind: data.behind || 0,
            localAhead: data.ahead || 0,
            localBranch: data.branch || 'main',
          });

          // If behind remote, also trigger a GitHub check to show available updates
          if ((data.behind || 0) > 0) {
            const state = get();
            if (!state.isChecking) {
              get().checkForUpdates();
            }
          }
        } catch (error) {
          console.error('Failed to check local status:', error);
        }
      },
    }),
    {
      name: 'agentic-os-update-store', // localStorage key
      // Signal hydration completion so auto-check waits for it
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (!error && _state) {
            _state.setHasHydrated(true);
          }
        };
      },
      // Only persist these fields — transient UI state is not persisted
      partialize: (state) => ({
        installedUpdates: state.installedUpdates,
        currentVersion: state.currentVersion,
        updateSettings: state.updateSettings,
        lastChecked: state.lastChecked,
        dismissedUpdateIds: state.dismissedUpdateIds,
        availableUpdates: state.availableUpdates.filter(u => u.status === 'available'),
        knownCommitHashes: state.knownCommitHashes,
        availableBranches: state.availableBranches,
        currentBranch: state.currentBranch,
        selectedBranch: state.selectedBranch,
      }),
      // Merge persisted data with defaults on hydration
      // KEY FIX: Persisted data ALWAYS wins over seed/defaults to prevent
      // "already installed updates showing as new" on refresh
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UpdateState>;
        const hasPersistedInstalled = persisted.installedUpdates && persisted.installedUpdates.length > 0;
        const hasPersistedAvailable = persisted.availableUpdates && persisted.availableUpdates.length > 0;

        // Build knownCommitHashes from persisted data if not directly stored
        // This handles migration from older versions that didn't have knownCommitHashes
        const persistedHashes = persisted.knownCommitHashes || [];
        const installedHashes = (persisted.installedUpdates || []).map((u: UpdateEntry) => u.commitHash).filter(Boolean);
        const availableHashes = (persisted.availableUpdates || []).map((u: UpdateEntry) => u.commitHash).filter(Boolean);
        const allKnownHashes = [...new Set([...persistedHashes, ...installedHashes, ...availableHashes])];

        return {
          ...currentState,
          _hasHydrated: false, // Will be set to true by onRehydrateStorage callback
          // Persisted installed updates take priority over seed data
          installedUpdates: hasPersistedInstalled ? persisted.installedUpdates! : currentState.installedUpdates,
          // Persisted available updates take priority over defaults
          availableUpdates: hasPersistedAvailable ? persisted.availableUpdates! : currentState.availableUpdates,
          currentVersion: (persisted.currentVersion || currentState.currentVersion).split('-')[0],
          updateSettings: persisted.updateSettings || currentState.updateSettings,
          lastChecked: persisted.lastChecked || 0,
          dismissedUpdateIds: persisted.dismissedUpdateIds || [],
          knownCommitHashes: allKnownHashes,
          // Branch state persistence
          availableBranches: persisted.availableBranches || currentState.availableBranches,
          currentBranch: persisted.currentBranch || currentState.currentBranch,
          selectedBranch: persisted.selectedBranch || currentState.selectedBranch,
        };
      },
    }
  )
);

// Export helper for use outside React
export { formatBytes, parseUpdateType, generateChangelog };
