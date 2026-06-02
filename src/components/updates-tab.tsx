'use client';

import { useUpdateStore, formatBytes, type UpdateEntry, type UpdateType, type UpdateStatus, type UpdateChannel } from '@/lib/update-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Download, Settings, Shield, Zap, Bug, Sparkles,
  Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  RotateCcw, Package, ArrowDownToLine, Server, Wifi,
  WifiOff, Loader2, ExternalLink, X, ToggleLeft, ToggleRight,
  Gauge, GitBranch, Eye, EyeOff,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Slider } from '@/components/ui/slider';

// ─── Type Badge Colors ───

const TYPE_CONFIG: Record<UpdateType, { color: string; icon: typeof Sparkles; label: string }> = {
  feature: { color: '#00ffff', icon: Sparkles, label: 'Feature' },
  fix: { color: '#FFB627', icon: Bug, label: 'Bug Fix' },
  security: { color: '#E63946', icon: Shield, label: 'Security' },
  performance: { color: '#00ff88', icon: Zap, label: 'Performance' },
};

const STATUS_CONFIG: Record<UpdateStatus, { color: string; label: string }> = {
  available: { color: '#00ffff', label: 'Available' },
  downloading: { color: '#FFB627', label: 'Downloading' },
  installing: { color: '#9d4edd', label: 'Installing' },
  installed: { color: '#00ff88', label: 'Installed' },
  failed: { color: '#E63946', label: 'Failed' },
};

const CHANNEL_CONFIG: Record<UpdateChannel, { color: string; label: string; description: string }> = {
  stable: { color: '#00ff88', label: 'Stable', description: 'Production-ready releases only' },
  beta: { color: '#FFB627', label: 'Beta', description: 'Pre-release with new features' },
  nightly: { color: '#E63946', label: 'Nightly', description: 'Latest commits, may be unstable' },
};

// ─── Glass Card Component ───

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Animated Progress Bar ───

function UpdateProgressBar({ progress, status, color = '#00ffff' }: { progress: number; status: UpdateStatus; color?: string }) {
  return (
    <div className="w-full h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          boxShadow: `0 0 8px ${color}40`,
        }}
      >
        {status === 'downloading' || status === 'installing' ? (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

// ─── Toast Notification ───

function UpdateToast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
  const colors = {
    success: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)', text: '#00ff88', icon: CheckCircle2 },
    info: { bg: 'rgba(0,255,255,0.1)', border: 'rgba(0,255,255,0.3)', text: '#00ffff', icon: Server },
    warning: { bg: 'rgba(255,182,39,0.1)', border: 'rgba(255,182,39,0.3)', text: '#FFB627', icon: AlertTriangle },
  };

  const config = colors[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}
      >
        <Icon size={16} style={{ color: config.text }} />
        <span className="text-xs font-medium" style={{ color: config.text }}>{message}</span>
        <button onClick={onClose} className="ml-2 text-[#8888aa] hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Update Entry Card ───

function UpdateCard({ update, onInstall, onRollback, isInstalling }: {
  update: UpdateEntry;
  onInstall: (id: string) => void;
  onRollback: (id: string) => void;
  isInstalling: boolean;
}) {
  const typeConfig = TYPE_CONFIG[update.type];
  const statusConfig = STATUS_CONFIG[update.status];
  const TypeIcon = typeConfig.icon;
  const isAvailable = update.status === 'available';
  const isInstalled = update.status === 'installed';
  const isInProgress = update.status === 'downloading' || update.status === 'installing';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group"
    >
      <div
        className="rounded-xl border p-4 transition-all duration-300 card-hover"
        style={{
          background: `linear-gradient(135deg, ${typeConfig.color}06, ${typeConfig.color}02, rgba(18,18,42,0.6))`,
          borderColor: `${typeConfig.color}20`,
        }}
      >
        {/* Top row: type badge, version, status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${typeConfig.color}20, ${typeConfig.color}08)`,
                border: `1px solid ${typeConfig.color}30`,
              }}
            >
              <TypeIcon size={14} style={{ color: typeConfig.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold tracking-wider uppercase"
                  style={{
                    borderColor: `${typeConfig.color}35`,
                    color: typeConfig.color,
                    background: `${typeConfig.color}10`,
                  }}
                >
                  {typeConfig.label}
                </span>
                <span className="text-[9px] font-mono text-[#8888aa]">v{update.version}</span>
              </div>
              <h4 className="text-white font-semibold text-xs mt-0.5 line-clamp-1">{update.title}</h4>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isInProgress ? (
              <Loader2 size={12} className="animate-spin" style={{ color: statusConfig.color }} />
            ) : isInstalled ? (
              <CheckCircle2 size={12} style={{ color: statusConfig.color }} />
            ) : (
              <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: statusConfig.color }} />
            )}
            <span className="text-[8px] font-bold tracking-wider" style={{ color: statusConfig.color }}>
              {statusConfig.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#ccccdd] text-[10px] leading-relaxed mb-3 line-clamp-2">{update.description}</p>

        {/* Progress bar for downloads/installs */}
        {isInProgress && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">
                {update.status === 'downloading' ? 'Downloading' : 'Installing'}...
              </span>
              <span className="text-[9px] font-mono" style={{ color: typeConfig.color }}>
                {update.progress || 0}%
              </span>
            </div>
            <UpdateProgressBar progress={update.progress || 0} status={update.status} color={typeConfig.color} />
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[9px] text-[#8888aa]">
            <span className="flex items-center gap-1">
              <Package size={9} />
              {formatBytes(update.size)}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch size={9} />
              {update.commitHash}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={9} />
              {new Date(update.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Action buttons */}
          {isAvailable && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onInstall(update.id)}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${typeConfig.color}15, ${typeConfig.color}08)`,
                border: `1px solid ${typeConfig.color}30`,
                color: typeConfig.color,
              }}
            >
              <Download size={10} />
              Install
            </motion.button>
          )}

          {isInstalled && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRollback(update.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 border border-[rgba(136,136,170,0.2)] text-[#8888aa] hover:text-[#FFB627] hover:border-[rgba(255,182,39,0.3)]"
            >
              <RotateCcw size={10} />
              Rollback
            </motion.button>
          )}
        </div>

        {/* Changelog expandable */}
        {update.changelog && (
          <ChangelogSection changelog={update.changelog} color={typeConfig.color} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Changelog Section ───

function ChangelogSection({ changelog, color }: { changelog: string; color: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[9px] text-[#8888aa] hover:text-white transition-colors w-full"
      >
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        Changelog
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 p-3 rounded-lg text-[10px] leading-relaxed font-mono"
              style={{
                background: `${color}05`,
                border: `1px solid ${color}10`,
                color: '#ccccdd',
              }}
            >
              {changelog.split('\n').map((line, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span style={{ color }} className="flex-shrink-0 mt-0.5">•</span>
                  <span>{line.replace(/^-\s*/, '')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Settings Panel ───

function UpdateSettingsPanel() {
  const { updateSettings, setUpdateSettings, checkForUpdates } = useUpdateStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState(updateSettings.githubToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);

  return (
    <GlassCard>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-[#9d4edd]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Update Settings</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-[#8888aa]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Auto-check toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-[11px] font-medium">Auto-Check Updates</div>
                  <div className="text-[9px] text-[#8888aa]">Periodically check GitHub for new releases</div>
                </div>
                <button
                  onClick={() => setUpdateSettings({ autoCheck: !updateSettings.autoCheck })}
                  className="relative"
                >
                  <motion.div
                    className="w-10 h-5 rounded-full flex items-center px-0.5"
                    animate={{ backgroundColor: updateSettings.autoCheck ? '#00ff88' : 'rgba(136,136,170,0.3)' }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: updateSettings.autoCheck ? 20 : 0 }}
                      transition={{ duration: 0.2, type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.div>
                </button>
              </div>

              {/* Auto-install toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-[11px] font-medium">Auto-Install Updates</div>
                  <div className="text-[9px] text-[#8888aa]">Automatically install available updates</div>
                </div>
                <button
                  onClick={() => setUpdateSettings({ autoInstall: !updateSettings.autoInstall })}
                  className="relative"
                >
                  <motion.div
                    className="w-10 h-5 rounded-full flex items-center px-0.5"
                    animate={{ backgroundColor: updateSettings.autoInstall ? '#FFB627' : 'rgba(136,136,170,0.3)' }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: updateSettings.autoInstall ? 20 : 0 }}
                      transition={{ duration: 0.2, type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.div>
                </button>
              </div>

              {/* Check interval slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white text-[11px] font-medium">Check Interval</div>
                  <span className="text-[10px] font-mono text-[#9d4edd]">{updateSettings.checkInterval} min</span>
                </div>
                <Slider
                  value={[updateSettings.checkInterval]}
                  min={5}
                  max={120}
                  step={5}
                  onValueChange={([value]) => setUpdateSettings({ checkInterval: value })}
                  className="w-full"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-[#8888aa]">5 min</span>
                  <span className="text-[8px] text-[#8888aa]">120 min</span>
                </div>
              </div>

              {/* Channel selector */}
              <div>
                <div className="text-white text-[11px] font-medium mb-2">Update Channel</div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(CHANNEL_CONFIG) as [UpdateChannel, typeof CHANNEL_CONFIG.stable][]).map(([key, config]) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setUpdateSettings({ channel: key })}
                      className={`p-2.5 rounded-lg border text-center transition-all duration-200 ${
                        updateSettings.channel === key ? 'ring-1' : ''
                      }`}
                      style={{
                        background: updateSettings.channel === key ? `${config.color}10` : 'rgba(10,10,26,0.4)',
                        borderColor: updateSettings.channel === key ? `${config.color}40` : 'rgba(157,78,221,0.1)',
                      }}
                    >
                      <div className="text-[10px] font-bold" style={{ color: updateSettings.channel === key ? config.color : '#8888aa' }}>
                        {config.label}
                      </div>
                      <div className="text-[7px] text-[#8888aa] mt-0.5 leading-tight">{config.description}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* GitHub Token — optional, stored in localStorage, not .env */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-white text-[11px] font-medium flex items-center gap-1.5">
                      <Shield size={11} className="text-[#9d4edd]" />
                      GitHub Token
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 font-bold">OPTIONAL</span>
                    </div>
                    <div className="text-[9px] text-[#8888aa]">Updates work without a token for public repos. Add a token for private repos &amp; higher rate limits — stored locally, never in .env</div>
                  </div>
                  {updateSettings.githubToken && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 font-bold">ACTIVE</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[10px] text-white font-mono placeholder:text-[#8888aa] outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors pr-8"
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8888aa] hover:text-white transition-colors"
                    >
                      {showToken ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      setIsSavingToken(true);
                      setUpdateSettings({ githubToken: tokenInput.trim() || undefined });
                      // Verify the token works by checking for updates
                      await checkForUpdates();
                      setIsSavingToken(false);
                    }}
                    disabled={isSavingToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium border border-[rgba(0,255,255,0.25)] text-[#00ffff] bg-[rgba(0,255,255,0.06)] hover:bg-[rgba(0,255,255,0.12)] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSavingToken ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Download size={10} />
                    )}
                    {tokenInput.trim() ? 'Save & Check' : 'Remove'}
                  </motion.button>
                </div>
                {updateSettings.githubToken && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[8px] text-[#00ff88]">
                    <CheckCircle2 size={8} />
                    <span>Token saved — updates will use this token for higher rate limits (optional — updates work without it)</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ─── Connection Status ───

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isConnected ? (
        <>
          <Wifi size={10} className="text-[#00ff88]" />
          <span className="text-[8px] font-bold tracking-wider text-[#00ff88]">CONNECTED</span>
        </>
      ) : (
        <>
          <WifiOff size={10} className="text-[#E63946]" />
          <span className="text-[8px] font-bold tracking-wider text-[#E63946]">OFFLINE</span>
        </>
      )}
    </div>
  );
}

// ─── Version Badge ───

function VersionBadge({ version }: { version: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{
        background: 'linear-gradient(135deg, rgba(0,255,255,0.08), rgba(157,78,221,0.08))',
        borderColor: 'rgba(0,255,255,0.25)',
      }}
    >
      <GitBranch size={12} className="text-[#00ffff]" />
      <span className="text-[10px] font-mono font-bold text-[#00ffff]">v{version}</span>
    </motion.div>
  );
}

// ─── Empty State ───

function EmptyState({ type }: { type: 'available' | 'installed' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: type === 'available' ? 'rgba(0,255,255,0.08)' : 'rgba(0,255,136,0.08)',
          border: type === 'available' ? '1px solid rgba(0,255,255,0.15)' : '1px solid rgba(0,255,136,0.15)',
        }}
      >
        {type === 'available' ? (
          <ArrowDownToLine size={20} className="text-[#00ffff]" />
        ) : (
          <Package size={20} className="text-[#00ff88]" />
        )}
      </div>
      <div className="text-white text-xs font-medium mb-1">
        {type === 'available' ? 'No Available Updates' : 'No Installed Updates'}
      </div>
      <div className="text-[#8888aa] text-[10px]">
        {type === 'available' ? 'Your system is up to date' : 'Updates you install will appear here'}
      </div>
    </div>
  );
}

// ─── Main Updates Tab Component ───

export function UpdatesTab() {
  const {
    availableUpdates,
    installedUpdates,
    updateSettings,
    isChecking,
    isInstalling,
    lastChecked,
    currentVersion,
    checkForUpdates,
    installUpdate,
    installAllUpdates,
    rollbackUpdate,
  } = useUpdateStore();

  const [activeTab, setActiveTab] = useState<'available' | 'installed'>('available');
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'warning' }>>([]);
  const [isConnected, setIsConnected] = useState(true);

  // Particles state — generated only on client to avoid hydration mismatch
  const [particles] = useState(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
  })));
  // Current time for formatLastChecked — client-only to avoid hydration mismatch
  const [now, setNow] = useState<number | null>(null);

  // Check GitHub connectivity on mount — works without token for public repos
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const headers: {[key: string]: string} = {};
        if (updateSettings.githubToken) {
          headers['X-GitHub-Token'] = updateSettings.githubToken;
        }
        const res = await fetch('/api/updates?action=status', { headers });
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.githubReachable !== false);
        } else {
          // Even if the status endpoint fails, GitHub might still be reachable
          // Don't immediately mark as offline
          setIsConnected(true);
        }
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
    // Recheck every 2 minutes
    const connInterval = setInterval(checkConnection, 120000);
    return () => clearInterval(connInterval);
  }, []);

  useEffect(() => {
    // Timer-based setState is intentional for clock updates
    setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-check for updates (only after hydration is complete)
  useEffect(() => {
    if (!updateSettings.autoCheck) return;

    // Wait for the update store to hydrate from localStorage before checking
    const unsubscribe = useUpdateStore.subscribe((state) => {
      if (state._hasHydrated) {
        // Hydration complete — safe to check for updates
        checkForUpdates();
        unsubscribe();
      }
    });

    // Also check if already hydrated (race condition)
    const currentState = useUpdateStore.getState();
    if (currentState._hasHydrated) {
      checkForUpdates();
      unsubscribe();
    }

    // Set up interval
    const interval = setInterval(() => {
      checkForUpdates();
    }, updateSettings.checkInterval * 60 * 1000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [updateSettings.autoCheck, updateSettings.checkInterval, checkForUpdates]);

  // Toast helper with unique IDs
  const toastCounter = useRef(0);
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${++toastCounter.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Notify on new updates (using useEffect to avoid render-phase side effects)
  const prevUpdateCountRef = useRef(0);
  useEffect(() => {
    if (availableUpdates.length > 0 && availableUpdates.length !== prevUpdateCountRef.current && !isChecking) {
      prevUpdateCountRef.current = availableUpdates.length;
      addToast(`${availableUpdates.length} update${availableUpdates.length > 1 ? 's' : ''} available`, 'info'); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [availableUpdates.length, isChecking, addToast]);

  // Handle install with toast
  const handleInstall = useCallback(async (id: string) => {
    addToast('Installing update...', 'info');
    try {
      await installUpdate(id);
      addToast('Update installed successfully!', 'success');
    } catch {
      addToast('Failed to install update', 'warning');
    }
  }, [installUpdate, addToast]);

  // Handle rollback with toast
  const handleRollback = useCallback(async (id: string) => {
    addToast('Rolling back update...', 'warning');
    await rollbackUpdate(id);
    addToast('Update rolled back successfully', 'success');
  }, [rollbackUpdate, addToast]);

  // Handle check with toast
  const handleCheck = useCallback(async () => {
    addToast('Checking for updates...', 'info');
    await checkForUpdates();
  }, [checkForUpdates, addToast]);

  // Handle install all
  const handleInstallAll = useCallback(async () => {
    addToast(`Installing ${availableUpdates.length} updates...`, 'info');
    await installAllUpdates();
    addToast('All updates installed!', 'success');
  }, [installAllUpdates, availableUpdates.length, addToast]);

  const formatLastChecked = (timestamp: number) => {
    if (!timestamp) return 'Never';
    if (!now) return '';
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {/* Toast notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <UpdateToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[rgba(0,255,255,0.08)] via-[rgba(157,78,221,0.06)] to-[rgba(10,10,26,0.8)] border border-[rgba(0,255,255,0.15)] p-6"
      >
        {/* Animated particles — client-only */}
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.id % 2 === 0 ? '#00ffff' : '#9d4edd',
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
              y: [0, -20, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <motion.h2
                className="text-2xl font-bold mb-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00ffff] via-[#9d4edd] to-[#00ffff] bg-[length:200%_auto] animate-gradient">
                  System Updates
                </span>
              </motion.h2>
              <p className="text-[#8888aa] text-xs">Auto-pull from GitHub (no token needed) · Install updates · Rollback changes</p>
            </div>
            <VersionBadge version={currentVersion} />
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.2)]">
              <ArrowDownToLine size={10} className="text-[#00ffff]" />
              <span className="text-[10px] text-[#00ffff] font-medium">{availableUpdates.length} available</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
              <CheckCircle2 size={10} className="text-[#00ff88]" />
              <span className="text-[10px] text-[#00ff88] font-medium">{installedUpdates.length} installed</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8888aa]">
              <Clock size={10} />
              Last checked: {formatLastChecked(lastChecked)}
            </div>
            <ConnectionStatus isConnected={isConnected} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheck}
              disabled={isChecking}
              className="btn-premium flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.div
                animate={{ rotate: isChecking ? 360 : 0 }}
                transition={{ duration: 1, repeat: isChecking ? Infinity : 0, ease: 'linear' }}
              >
                <RefreshCw size={13} />
              </motion.div>
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </motion.button>

            {availableUpdates.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstallAll}
                disabled={isInstalling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-medium border border-[rgba(0,255,136,0.25)] text-[#00ff88] bg-[rgba(0,255,136,0.06)] hover:bg-[rgba(0,255,136,0.12)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={13} />
                Install All ({availableUpdates.length})
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Settings Panel ─── */}
      <UpdateSettingsPanel />

      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.1)]">
        {(['available', 'installed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-all duration-200 ${
              activeTab === tab ? 'text-white' : 'text-[#8888aa] hover:text-[#ccccdd]'
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="updates-tab-indicator"
                className="absolute inset-0 rounded-md"
                style={{
                  background: tab === 'available' ? 'rgba(0,255,255,0.1)' : 'rgba(0,255,136,0.1)',
                  border: `1px solid ${tab === 'available' ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,136,0.2)'}`,
                }}
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab === 'available' ? <ArrowDownToLine size={12} /> : <CheckCircle2 size={12} />}
              {tab === 'available' ? 'Available' : 'Installed'}
              {tab === 'available' && availableUpdates.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#00ffff]/20 text-[#00ffff] font-mono">
                  {availableUpdates.length}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Updates List ─── */}
      <AnimatePresence mode="wait">
        {activeTab === 'available' ? (
          <motion.div
            key="available"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {availableUpdates.length === 0 ? (
              <GlassCard>
                <EmptyState type="available" />
              </GlassCard>
            ) : (
              availableUpdates.map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onInstall={handleInstall}
                  onRollback={handleRollback}
                  isInstalling={isInstalling}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="installed"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {installedUpdates.length === 0 ? (
              <GlassCard>
                <EmptyState type="installed" />
              </GlassCard>
            ) : (
              installedUpdates.map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onInstall={handleInstall}
                  onRollback={handleRollback}
                  isInstalling={isInstalling}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Update Activity Timeline ─── */}
      <GlassCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-[#FFB627]" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Update Activity</span>
            </div>
          </div>

          {/* Activity stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Total Installed</div>
              <div className="text-white font-mono font-bold text-lg">{installedUpdates.length}</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Pending</div>
              <div className="text-[#00ffff] font-mono font-bold text-lg">{availableUpdates.length}</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Channel</div>
              <div className="font-mono font-bold text-lg" style={{ color: CHANNEL_CONFIG[updateSettings.channel].color }}>
                {CHANNEL_CONFIG[updateSettings.channel].label}
              </div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Auto-Check</div>
              <div className={`font-mono font-bold text-lg ${updateSettings.autoCheck ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                {updateSettings.autoCheck ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>

          {/* Recent activity timeline */}
          <div className="mt-4 pt-3 border-t border-[rgba(157,78,221,0.1)]">
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-3">Recent Activity</div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {installedUpdates.slice(0, 5).map((update, i) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 text-[10px]"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_CONFIG[update.type].color }}
                  />
                  <span className="text-[#ccccdd] truncate flex-1">{update.title}</span>
                  <span className="text-[#8888aa] flex-shrink-0">
                    {new Date(update.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span
                    className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold tracking-wider uppercase flex-shrink-0"
                    style={{
                      borderColor: `${TYPE_CONFIG[update.type].color}35`,
                      color: TYPE_CONFIG[update.type].color,
                      background: `${TYPE_CONFIG[update.type].color}10`,
                    }}
                  >
                    {TYPE_CONFIG[update.type].label}
                  </span>
                </motion.div>
              ))}
              {installedUpdates.length === 0 && (
                <div className="text-center py-4 text-[10px] text-[#8888aa]">
                  No update activity yet
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ─── GitHub Connection ─── */}
      <GlassCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-[#9d4edd]" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">GitHub Source</span>
            </div>
            <ConnectionStatus isConnected={isConnected} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.1)]">
            <div className="w-8 h-8 rounded-lg bg-[rgba(36,36,72,0.8)] flex items-center justify-center flex-shrink-0">
              <GitBranch size={16} className="text-[#8888aa]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[11px] font-medium truncate">rachidSabah/Agentic-os</div>
              <div className="text-[9px] text-[#8888aa]">
                main branch · auto-pull enabled
                {updateSettings.githubToken ? (
                  <span className="text-[#00ff88] ml-1">· token active</span>
                ) : (
                  <span className="text-[#FFB627] ml-1">· no token (public only)</span>
                )}
              </div>
            </div>
            <a
              href="https://github.com/rachidSabah/Agentic-os"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
            >
              <ExternalLink size={10} />
              Open
            </a>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
