'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Search, Plus, CheckCircle2, XCircle, Download,
  Trash2, ExternalLink, Wrench, Wifi, WifiOff, RefreshCw,
  Clock, Package, Grid, List, Filter, X, ChevronRight,
  Activity, Globe, Terminal, Zap, Shield, ArrowUpRight,
  Link2, Eye, Database, Layers,
} from 'lucide-react';

// ─── Types ───

type ServerStatus = 'connected' | 'disconnected' | 'installing' | 'error';
type ServerCategory = 'database' | 'search' | 'automation' | 'communication' | 'development' | 'ai' | 'custom';

interface MCPTool {
  name: string;
  description: string;
  lastUsed?: number;
}

interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: ServerCategory;
  status: ServerStatus;
  toolCount: number;
  tools: MCPTool[];
  version: string;
  author: string;
  url: string;
  lastSync?: number;
  installProgress?: number;
  icon: string;
  featured?: boolean;
}

// ─── Color Constants ───

const STATUS_COLORS: Record<ServerStatus, string> = {
  connected: '#00ff88',
  disconnected: '#8888aa',
  installing: '#FFB627',
  error: '#E63946',
};

const CATEGORY_COLORS: Record<ServerCategory, string> = {
  database: '#2E86AB',
  search: '#9d4edd',
  automation: '#E8751A',
  communication: '#FFB627',
  development: '#00ffff',
  ai: '#E63946',
  custom: '#00ff88',
};

const CATEGORY_ICONS: Record<ServerCategory, React.ReactNode> = {
  database: <Database size={12} />,
  search: <Search size={12} />,
  automation: <Zap size={12} />,
  communication: <Link2 size={12} />,
  development: <Terminal size={12} />,
  ai: <Layers size={12} />,
  custom: <Plus size={12} />,
};

// ─── Mock Data ───

const MOCK_SERVERS: MCPServer[] = [
  {
    id: 's1', name: 'PostgreSQL Bridge', description: 'Direct PostgreSQL database access with read/write query capabilities and connection pooling.', category: 'database', status: 'connected', toolCount: 8,
    tools: [
      { name: 'query', description: 'Execute SQL queries', lastUsed: Date.now() - 300000 },
      { name: 'list_tables', description: 'List all tables in schema', lastUsed: Date.now() - 600000 },
      { name: 'describe_table', description: 'Get table schema details' },
      { name: 'insert_row', description: 'Insert data into table' },
      { name: 'update_row', description: 'Update existing records' },
      { name: 'delete_row', description: 'Delete records from table' },
      { name: 'create_migration', description: 'Create database migration' },
      { name: 'explain_query', description: 'Get query execution plan' },
    ],
    version: '2.4.1', author: 'Hermes Team', url: 'mcp://postgres-bridge.local', lastSync: Date.now() - 120000, icon: '🐘',
  },
  {
    id: 's2', name: 'Brave Search', description: 'Web search powered by Brave Search API. Returns ranked results with snippets and metadata.', category: 'search', status: 'connected', toolCount: 4,
    tools: [
      { name: 'web_search', description: 'Search the web for information', lastUsed: Date.now() - 60000 },
      { name: 'news_search', description: 'Search news articles', lastUsed: Date.now() - 180000 },
      { name: 'image_search', description: 'Search for images' },
      { name: 'suggest', description: 'Get search suggestions' },
    ],
    version: '1.3.0', author: 'Brave Software', url: 'mcp://brave-search.local', lastSync: Date.now() - 90000, icon: '🔍', featured: true,
  },
  {
    id: 's3', name: 'GitHub Copilot', description: 'GitHub repository access, PR management, issue tracking, and code search capabilities.', category: 'development', status: 'connected', toolCount: 12,
    tools: [
      { name: 'search_code', description: 'Search code across repos', lastUsed: Date.now() - 450000 },
      { name: 'create_pr', description: 'Create pull request' },
      { name: 'list_issues', description: 'List repository issues' },
      { name: 'create_issue', description: 'Create new issue' },
      { name: 'get_file', description: 'Get file contents' },
      { name: 'push_changes', description: 'Push code changes' },
      { name: 'review_pr', description: 'Review a pull request' },
      { name: 'merge_pr', description: 'Merge a pull request' },
      { name: 'list_repos', description: 'List user repositories' },
      { name: 'get_workflow', description: 'Get GitHub Actions status' },
      { name: 'create_branch', description: 'Create new branch' },
      { name: 'list_commits', description: 'List recent commits' },
    ],
    version: '3.1.0', author: 'GitHub Inc.', url: 'mcp://github-copilot.local', lastSync: Date.now() - 200000, icon: '🐙', featured: true,
  },
  {
    id: 's4', name: 'Slack Bridge', description: 'Send and receive Slack messages, manage channels, and search message history.', category: 'communication', status: 'disconnected', toolCount: 6,
    tools: [
      { name: 'send_message', description: 'Send message to channel' },
      { name: 'read_channel', description: 'Read recent messages' },
      { name: 'search_messages', description: 'Search message history' },
      { name: 'list_channels', description: 'List available channels' },
      { name: 'create_channel', description: 'Create new channel' },
      { name: 'upload_file', description: 'Upload file to channel' },
    ],
    version: '1.1.2', author: 'Slack Technologies', url: 'mcp://slack-bridge.local', icon: '💬',
  },
  {
    id: 's5', name: 'Browser Automation', description: 'Headless browser control for web scraping, form filling, screenshots, and automation workflows.', category: 'automation', status: 'connected', toolCount: 7,
    tools: [
      { name: 'navigate', description: 'Navigate to URL', lastUsed: Date.now() - 10000 },
      { name: 'screenshot', description: 'Take page screenshot', lastUsed: Date.now() - 30000 },
      { name: 'click', description: 'Click element on page' },
      { name: 'type_text', description: 'Type text into input field' },
      { name: 'extract_text', description: 'Extract text from page' },
      { name: 'fill_form', description: 'Fill out form fields' },
      { name: 'wait_for', description: 'Wait for element to appear' },
    ],
    version: '2.0.4', author: 'Browserbase', url: 'mcp://browser-automation.local', lastSync: Date.now() - 45000, icon: '🌐', featured: true,
  },
  {
    id: 's6', name: 'Claude Vision', description: 'Image and document analysis using Claude vision capabilities. Supports PDF, PNG, JPG.', category: 'ai', status: 'connected', toolCount: 3,
    tools: [
      { name: 'analyze_image', description: 'Analyze image content', lastUsed: Date.now() - 120000 },
      { name: 'extract_text_ocr', description: 'Extract text from images' },
      { name: 'compare_images', description: 'Compare two images' },
    ],
    version: '1.0.0', author: 'Anthropic', url: 'mcp://claude-vision.local', lastSync: Date.now() - 300000, icon: '👁️',
  },
  {
    id: 's7', name: 'Redis Cache', description: 'In-memory caching layer with TTL support, pub/sub messaging, and queue management.', category: 'database', status: 'error', toolCount: 5,
    tools: [
      { name: 'get', description: 'Get cached value' },
      { name: 'set', description: 'Set cache value with TTL' },
      { name: 'delete', description: 'Delete cache key' },
      { name: 'publish', description: 'Publish message to channel' },
      { name: 'subscribe', description: 'Subscribe to channel' },
    ],
    version: '1.2.0', author: 'Redis Ltd.', url: 'mcp://redis-cache.local', icon: '🔴',
  },
  {
    id: 's8', name: 'Linear Project', description: 'Project management with Linear. Manage issues, projects, cycles, and teams.', category: 'automation', status: 'connected', toolCount: 6,
    tools: [
      { name: 'create_issue', description: 'Create new issue', lastUsed: Date.now() - 80000 },
      { name: 'list_issues', description: 'List project issues' },
      { name: 'update_issue', description: 'Update issue status' },
      { name: 'list_projects', description: 'List projects' },
      { name: 'create_comment', description: 'Add comment to issue' },
      { name: 'search_issues', description: 'Search issues by query' },
    ],
    version: '1.0.3', author: 'Linear Inc.', url: 'mcp://linear.local', lastSync: Date.now() - 150000, icon: '📋',
  },
  {
    id: 's9', name: 'Elasticsearch', description: 'Full-text search and analytics engine with index management and aggregations.', category: 'search', status: 'disconnected', toolCount: 4,
    tools: [
      { name: 'search', description: 'Full-text search query' },
      { name: 'index_document', description: 'Index a document' },
      { name: 'aggregate', description: 'Run aggregation query' },
      { name: 'list_indices', description: 'List all indices' },
    ],
    version: '2.1.0', author: 'Elastic BV', url: 'mcp://elasticsearch.local', icon: '🔎',
  },
  {
    id: 's10', name: 'Docker Engine', description: 'Container management with build, run, stop capabilities and volume orchestration.', category: 'development', status: 'installing', toolCount: 5, installProgress: 67,
    tools: [
      { name: 'build_image', description: 'Build Docker image' },
      { name: 'run_container', description: 'Run container from image' },
      { name: 'list_containers', description: 'List running containers' },
      { name: 'stop_container', description: 'Stop running container' },
      { name: 'view_logs', description: 'View container logs' },
    ],
    version: '1.0.0-beta', author: 'Docker Inc.', url: 'mcp://docker-engine.local', icon: '🐳',
  },
];

// ─── GlassCard Component ───

function GlassCard({ children, className = '', glowColor, onClick }: {
  children: React.ReactNode; className?: string; glowColor?: string; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={glowColor ? { scale: 1.005 } : undefined}
      onClick={onClick}
      className={`rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] ${className}`}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ─── Connection Pulse ───

function ConnectionPulse({ status }: { status: ServerStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'connected' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

// ─── Main Component ───

export function MCPRegistry() {
  const [servers, setServers] = useState<MCPServer[]>(MOCK_SERVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServerCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ServerStatus | 'all'>('all');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerName, setNewServerName] = useState('');

  const categories: ServerCategory[] = ['database', 'search', 'automation', 'communication', 'development', 'ai', 'custom'];
  const statuses: ServerStatus[] = ['connected', 'disconnected', 'installing', 'error'];

  // Filtered servers
  const filteredServers = useMemo(() => {
    let result = [...servers];
    if (filterCategory !== 'all') result = result.filter(s => s.category === filterCategory);
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return result;
  }, [servers, filterCategory, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = servers.length;
    const connected = servers.filter(s => s.status === 'connected').length;
    const toolsAvailable = servers.filter(s => s.status === 'connected').reduce((sum, s) => sum + s.toolCount, 0);
    const errors = servers.filter(s => s.status === 'error').length;
    return { total, connected, toolsAvailable, errors };
  }, [servers]);

  // Selected server data
  const selectedServerData = useMemo(() => servers.find(s => s.id === selectedServer), [servers, selectedServer]);

  // Install / Uninstall
  const handleInstall = useCallback((serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'installing' as ServerStatus, installProgress: 0 } : s));
    // Simulate install progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'connected' as ServerStatus, installProgress: 100, lastSync: Date.now() } : s));
      } else {
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, installProgress: Math.round(progress) } : s));
      }
    }, 800);
  }, []);

  const handleUninstall = useCallback((serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'disconnected' as ServerStatus } : s));
    setSelectedServer(null);
  }, []);

  // Add custom server
  const handleAddServer = useCallback(() => {
    if (!newServerUrl.trim() || !newServerName.trim()) return;
    const newServer: MCPServer = {
      id: `s-${Date.now()}`,
      name: newServerName,
      description: 'Custom MCP server',
      category: 'custom',
      status: 'disconnected',
      toolCount: 0,
      tools: [],
      version: '0.1.0',
      author: 'Custom',
      url: newServerUrl,
      icon: '⚡',
    };
    setServers(prev => [...prev, newServer]);
    setNewServerUrl('');
    setNewServerName('');
    setShowAddServer(false);
    // Auto-install
    handleInstall(newServer.id);
  }, [newServerUrl, newServerName, handleInstall]);

  const formatTime = (ts?: number) => {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,136,0.1)', boxShadow: '0 0 15px rgba(0,255,136,0.3)' }}
          >
            <Server className="w-5 h-5" style={{ color: '#00ff88' }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">MCP Server Registry</h2>
            <p className="text-sm" style={{ color: '#8888aa' }}>
              <span className="font-mono" style={{ color: '#00ff88' }}>{stats.connected}</span>/{stats.total} connected · <span className="font-mono" style={{ color: '#00ffff' }}>{stats.toolsAvailable}</span> tools available
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#8888aa' }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search servers..." className="pl-8 pr-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white text-xs placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,136,0.3)] w-40" />
          </div>

          {/* Category filter */}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as ServerCategory | 'all')} className="px-2 py-1.5 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white focus:outline-none">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>

          {/* Status filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ServerStatus | 'all')} className="px-2 py-1.5 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white focus:outline-none">
            <option value="all">All Status</option>
            {statuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>

          {/* View mode */}
          <div className="flex gap-0.5 border border-[rgba(157,78,221,0.15)] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className="p-1.5 transition-colors" style={{ background: viewMode === 'grid' ? 'rgba(157,78,221,0.2)' : 'transparent', color: viewMode === 'grid' ? '#9d4edd' : '#8888aa' }}><Grid size={12} /></button>
            <button onClick={() => setViewMode('list')} className="p-1.5 transition-colors" style={{ background: viewMode === 'list' ? 'rgba(157,78,221,0.2)' : 'transparent', color: viewMode === 'list' ? '#9d4edd' : '#8888aa' }}><List size={12} /></button>
          </div>

          {/* Add server */}
          <button onClick={() => setShowAddServer(!showAddServer)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-xs hover:bg-[rgba(0,255,136,0.1)] transition-colors" style={{ color: '#00ff88' }}>
            <Plus size={12} /> Add Server
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Servers', value: stats.total, color: '#9d4edd', icon: <Server size={14} /> },
          { label: 'Connected', value: stats.connected, color: '#00ff88', icon: <Wifi size={14} /> },
          { label: 'Tools Available', value: stats.toolsAvailable, color: '#00ffff', icon: <Wrench size={14} /> },
          { label: 'Errors', value: stats.errors, color: '#E63946', icon: <XCircle size={14} /> },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard glowColor={stat.color} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="font-mono text-lg font-bold text-white">{stat.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Add Custom Server Form */}
      <AnimatePresence>
        {showAddServer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <GlassCard glowColor="#00ff88" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plus size={14} style={{ color: '#00ff88' }} />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Add Custom MCP Server</span>
                </div>
                <button onClick={() => setShowAddServer(false)} className="text-[#8888aa] hover:text-white"><X size={14} /></button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newServerName} onChange={e => setNewServerName(e.target.value)} placeholder="Server name" className="flex-1 px-3 py-2 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] text-white text-xs placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,136,0.3)]" />
                <input type="text" value={newServerUrl} onChange={e => setNewServerUrl(e.target.value)} placeholder="MCP server URL (e.g. mcp://my-server.local)" className="flex-1 px-3 py-2 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] text-white text-xs placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,136,0.3)]" />
                <button onClick={handleAddServer} className="px-4 py-2 rounded-lg border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.1)] text-xs font-semibold hover:bg-[rgba(0,255,136,0.2)] transition-colors" style={{ color: '#00ff88' }}>Connect</button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Server Grid / List + Detail */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence>
                {filteredServers.map((server, i) => (
                  <motion.div key={server.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard
                      glowColor={selectedServer === server.id ? STATUS_COLORS[server.status] : server.featured ? CATEGORY_COLORS[server.category] : undefined}
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedServer(selectedServer === server.id ? null : server.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${CATEGORY_COLORS[server.category]}15` }}>
                            {server.icon}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              {server.name}
                              {server.featured && <span className="text-[7px] px-1 py-0.5 rounded-full bg-[rgba(255,182,39,0.15)] text-[#FFB627] font-bold">★</span>}
                            </div>
                            <div className="text-[9px] font-mono" style={{ color: '#8888aa' }}>v{server.version}</div>
                          </div>
                        </div>
                        <ConnectionPulse status={server.status} />
                      </div>

                      <div className="text-[10px] mb-3 line-clamp-2" style={{ color: '#8888aa' }}>{server.description}</div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[server.category]}15`, color: CATEGORY_COLORS[server.category] }}>
                            {CATEGORY_ICONS[server.category]} {server.category}
                          </span>
                          <span className="text-[9px] flex items-center gap-1" style={{ color: '#ccccdd' }}>
                            <Wrench size={9} /> {server.toolCount}
                          </span>
                        </div>

                        {server.status === 'installing' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                              <motion.div animate={{ width: `${server.installProgress || 0}%` }} className="h-full rounded-full bg-[#FFB627]" />
                            </div>
                            <span className="text-[8px] font-mono text-[#FFB627]">{server.installProgress || 0}%</span>
                          </div>
                        ) : server.status === 'disconnected' ? (
                          <button onClick={e => { e.stopPropagation(); handleInstall(server.id); }} className="text-[9px] px-2 py-1 rounded-md border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors" style={{ color: '#00ff88' }}>
                            Install
                          </button>
                        ) : server.status === 'connected' ? (
                          <span className="text-[9px] font-mono" style={{ color: '#8888aa' }}>{formatTime(server.lastSync)}</span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-md border border-[rgba(230,57,70,0.2)] text-[#E63946]">Error</span>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {filteredServers.map((server, i) => (
                  <motion.div key={server.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                    <GlassCard
                      glowColor={selectedServer === server.id ? STATUS_COLORS[server.status] : undefined}
                      className="p-3 cursor-pointer"
                      onClick={() => setSelectedServer(selectedServer === server.id ? null : server.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${CATEGORY_COLORS[server.category]}15` }}>{server.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{server.name}</span>
                            <span className="text-[8px] font-mono" style={{ color: '#8888aa' }}>v{server.version}</span>
                            <span className="flex items-center gap-1 text-[8px] px-1 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[server.category]}15`, color: CATEGORY_COLORS[server.category] }}>
                              {CATEGORY_ICONS[server.category]} {server.category}
                            </span>
                          </div>
                          <div className="text-[10px] truncate" style={{ color: '#8888aa' }}>{server.description}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] flex items-center gap-1" style={{ color: '#ccccdd' }}><Wrench size={9} /> {server.toolCount}</span>
                          <ConnectionPulse status={server.status} />
                          <motion.div animate={{ rotate: selectedServer === server.id ? 90 : 0 }}><ChevronRight size={12} style={{ color: '#8888aa' }} /></motion.div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedServerData && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-80 shrink-0 hidden lg:block">
              <GlassCard glowColor={STATUS_COLORS[selectedServerData.status]} className="p-4 space-y-3 sticky top-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedServerData.icon}</span>
                    <h4 className="text-sm font-bold text-white">{selectedServerData.name}</h4>
                  </div>
                  <button onClick={() => setSelectedServer(null)} className="text-[#8888aa] hover:text-white"><X size={14} /></button>
                </div>

                <div className="flex items-center gap-2">
                  <ConnectionPulse status={selectedServerData.status} />
                  <span className="text-[10px] capitalize font-medium" style={{ color: STATUS_COLORS[selectedServerData.status] }}>{selectedServerData.status}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[selectedServerData.category]}15`, color: CATEGORY_COLORS[selectedServerData.category] }}>{selectedServerData.category}</span>
                </div>

                <div className="text-[10px]" style={{ color: '#8888aa' }}>{selectedServerData.description}</div>

                <div className="space-y-1.5 pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  {[
                    { label: 'Version', value: selectedServerData.version },
                    { label: 'Author', value: selectedServerData.author },
                    { label: 'URL', value: selectedServerData.url },
                    { label: 'Last Sync', value: formatTime(selectedServerData.lastSync) },
                    { label: 'Tools', value: `${selectedServerData.toolCount} available` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between text-xs">
                      <span style={{ color: '#8888aa' }}>{item.label}</span>
                      <span className="font-mono text-[#ccccdd] truncate ml-2 max-w-[160px]">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Tools list */}
                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Tools</div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                    {selectedServerData.tools.map(tool => (
                      <div key={tool.name} className="flex items-center gap-2 bg-[rgba(10,10,26,0.4)] rounded-lg p-2">
                        <Terminal size={10} style={{ color: CATEGORY_COLORS[selectedServerData.category] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono text-white">{tool.name}</div>
                          <div className="text-[8px] truncate" style={{ color: '#8888aa' }}>{tool.description}</div>
                        </div>
                        {tool.lastUsed && <span className="text-[8px] font-mono shrink-0" style={{ color: '#8888aa' }}>{formatTime(tool.lastUsed)}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)] flex gap-2">
                  {selectedServerData.status === 'connected' ? (
                    <>
                      <button onClick={() => handleUninstall(selectedServerData.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)] text-[10px] hover:bg-[rgba(230,57,70,0.1)] transition-colors" style={{ color: '#E63946' }}>
                        <Trash2 size={10} /> Disconnect
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-[10px] hover:bg-[rgba(0,255,136,0.1)] transition-colors" style={{ color: '#00ff88' }}>
                        <RefreshCw size={10} /> Sync
                      </button>
                    </>
                  ) : selectedServerData.status === 'disconnected' ? (
                    <button onClick={() => handleInstall(selectedServerData.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-[10px] hover:bg-[rgba(0,255,136,0.1)] transition-colors" style={{ color: '#00ff88' }}>
                      <Download size={10} /> Install
                    </button>
                  ) : selectedServerData.status === 'installing' ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-1.5">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <RefreshCw size={12} style={{ color: '#FFB627' }} />
                      </motion.div>
                      <span className="text-[10px] font-mono" style={{ color: '#FFB627' }}>Installing... {selectedServerData.installProgress || 0}%</span>
                    </div>
                  ) : (
                    <button onClick={() => handleInstall(selectedServerData.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)] text-[10px] hover:bg-[rgba(230,57,70,0.1)] transition-colors" style={{ color: '#E63946' }}>
                      <RefreshCw size={10} /> Retry
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(18,18,42,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157,78,221,0.3); border-radius: 2px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
