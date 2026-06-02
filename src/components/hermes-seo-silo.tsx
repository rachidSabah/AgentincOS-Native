'use client';

import { useOSStore, type SEOSilo, type SEOCluster, type SEOPage, type SEOIssue, type WebsiteScanResult } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, Globe, BarChart3, TrendingUp, ArrowRight,
  Layers, Brain, Target, FileText, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, CheckCircle2, Info, ExternalLink,
  Sparkles, Users, Shield, Lightbulb, Copy, Eye,
  Plus, Trash2, Edit3, Send, XCircle, Link2, LayoutDashboard,
  Scan, Network, PenTool, Unplug, ArrowUpRight, X, Check,
  Circle, BookOpen, Award, Clock, Server, Download, Upload,
  FileJson, FileSpreadsheet, Zap as Bolt, Activity, PieChart,
  ArrowLeftRight, Swords, Unlink, Wrench, Home, Mail, BookMarked,
} from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SEOLayerData {
  id: string;
  name: string;
  number: number;
  primaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  seoScore: number;
  lastAnalyzed: string | null;
}

type SEOTab = 'scanner' | 'silos' | 'clusters' | 'pages' | 'content' | 'links' | 'competitors' | 'dashboard';

type ContentType = 'blog post' | 'landing page' | 'product page' | 'pillar page' | 'how-to guide' | 'comparison' | 'review' | 'FAQ' | 'news' | 'case study';

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

const getScoreColor = (score: number) => {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#FFB627';
  if (score >= 40) return '#E8751A';
  return '#ff4444';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
};

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(157,78,221,0.12)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold" style={{ color, fontSize: size * 0.22 }}>{score}</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: {[key: string]: string} = { critical: '#ff4444', warning: '#FFB627', info: '#1B998B' };
  const c = colors[severity] || '#8888aa';
  return (
    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ color: c, backgroundColor: `${c}15`, border: `1px solid ${c}30` }}>
      {severity}
    </span>
  );
}

function SparklineChart({ data, color = '#FFB627', height = 32, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-[8px] text-[#8888aa]">No data</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {data.length > 0 && <circle cx={(data.length - 1) * step} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r="2" fill={color} />}
    </svg>
  );
}

function ProgressBar({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-[#8888aa] uppercase">{label}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const cardCls = 'rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)]';
const inputCls = 'w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-[11px] placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-30';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HermesSEOSilo() {
  const { hermesConnection, setActiveView, seoSilos, seoScanResults } = useOSStore();
  const [activeTab, setActiveTab] = useState<SEOTab>('scanner');
  const [hermesPowered, setHermesPowered] = useState(false);
  const [seoLayers, setSeoLayers] = useState<SEOLayerData[]>([]);
  const [avgScore, setAvgScore] = useState(0);

  const isHermesRunning = hermesConnection.running;

  const fetchSEOOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/seo');
      if (!res.ok) return;
      const data = await res.json();
      setSeoLayers(data.layers || []);
      setHermesPowered(data.hermesPowered ?? false);
      setAvgScore(data.avgScore || 0);
    } catch { /* silent */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSEOOverview(); }, [fetchSEOOverview]);

  const tabs: Array<{ id: SEOTab; label: string; icon: typeof Search }> = [
    { id: 'scanner', label: 'Scanner', icon: Scan },
    { id: 'silos', label: 'Silos', icon: Layers },
    { id: 'clusters', label: 'Clusters', icon: Network },
    { id: 'pages', label: 'Pages', icon: FileText },
    { id: 'content', label: 'Content', icon: PenTool },
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const totalScans = Object.keys(seoScanResults).length;
  const totalSilos = seoSilos.length;
  const totalClusters = seoSilos.reduce((sum, s) => sum + s.clusters.length, 0);
  const totalPages = seoSilos.reduce((sum, s) => sum + s.clusters.reduce((cs, c) => cs + c.pages.length, 0), 0);
  const overallScore = seoSilos.length > 0 ? Math.round(seoSilos.reduce((sum, s) => sum + s.score, 0) / seoSilos.length) : avgScore;

  return (
    <section aria-label="Hermes-Powered SEO Content Silo" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Search size={16} className="text-[#FFB627]" /> Hermes SEO Silo
          {hermesPowered && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#00ff8830] text-[#00ff88] bg-[#00ff8808] font-mono animate-pulse">
              AI-POWERED
            </span>
          )}
        </h2>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] text-[#8888aa]">
          <button onClick={() => setActiveView('mission-control')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <span className="text-[#FFB627]">SEO Silo</span>
        </nav>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className={`w-2 h-2 rounded-full ${isHermesRunning ? 'animate-pulse-glow' : ''}`}
              style={{ backgroundColor: isHermesRunning ? '#00ff88' : '#ff4444' }} />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Hermes</span>
          </div>
          <div className="font-mono font-bold text-sm" style={{ color: isHermesRunning ? '#00ff88' : '#ff4444' }}>
            {isHermesRunning ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">SEO Score</div>
          <div className="font-mono font-bold text-lg" style={{ color: getScoreColor(overallScore) }}>{overallScore}</div>
        </div>
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Scans</div>
          <div className="font-mono font-bold text-lg text-[#7B2CBF]">{totalScans}</div>
        </div>
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Silos</div>
          <div className="font-mono font-bold text-lg text-[#1B998B]">{totalSilos}</div>
        </div>
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Clusters</div>
          <div className="font-mono font-bold text-lg text-[#E8751A]">{totalClusters}</div>
        </div>
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Pages</div>
          <div className="font-mono font-bold text-lg text-[#2E86AB]">{totalPages}</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={activeTab === tab.id ? { background: '#FFB62715', border: '1px solid #FFB62730' } : { border: '1px solid transparent' }}
          >
            <tab.icon size={12} style={{ color: activeTab === tab.id ? '#FFB627' : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'scanner' && <ScannerTab />}
        {activeTab === 'silos' && <SilosTab />}
        {activeTab === 'clusters' && <ClustersTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'links' && <LinksTab />}
        {activeTab === 'competitors' && <CompetitorsTab />}
        {activeTab === 'dashboard' && <DashboardTab seoLayers={seoLayers} avgScore={avgScore} hermesPowered={hermesPowered} />}
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Scanner Tab
// ---------------------------------------------------------------------------

function ScannerTab() {
  const { seoScanResults, addScanResult } = useOSStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [aiScanLoading, setAiScanLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<Record<string, unknown> | null>(null);
  const [showBatch, setShowBatch] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');

  const handleScan = async (scanUrl?: string) => {
    const targetUrl = scanUrl || url.trim();
    if (!targetUrl || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan-website', url: targetUrl }),
      });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      const result = data.result || data;
      addScanResult(targetUrl, {
        url: targetUrl,
        title: result.title || '',
        metaDescription: result.metaDescription || '',
        h1: result.h1 || '',
        h2s: result.h2s || [],
        canonicalUrl: result.canonicalUrl || '',
        robotsMeta: result.robotsMeta || '',
        schemaTypes: result.schemaTypes || [],
        pageSize: result.pageSize || 0,
        loadTime: result.loadTime || 0,
        mobileFriendly: result.mobileFriendly ?? true,
        https: result.https ?? targetUrl.startsWith('https'),
        issues: (result.issues || []).map((i: SEOIssue) => ({
          severity: i.severity || 'info',
          category: i.category || 'technical',
          description: i.description || '',
          fix: i.fix || '',
        })),
        score: result.score || 0,
        scannedAt: result.scannedAt || Date.now(),
      });
      setSelectedUrl(targetUrl);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleBatchScan = async () => {
    const urls = batchUrls.split(',').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setLoading(true);
    for (const batchUrl of urls) {
      try {
        const res = await fetch('/api/hermes/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'scan-website', url: batchUrl }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const result = data.result || data;
        addScanResult(batchUrl, {
          url: batchUrl,
          title: result.title || '',
          metaDescription: result.metaDescription || '',
          h1: result.h1 || '',
          h2s: result.h2s || [],
          canonicalUrl: result.canonicalUrl || '',
          robotsMeta: result.robotsMeta || '',
          schemaTypes: result.schemaTypes || [],
          pageSize: result.pageSize || 0,
          loadTime: result.loadTime || 0,
          mobileFriendly: result.mobileFriendly ?? true,
          https: result.https ?? batchUrl.startsWith('https'),
          issues: (result.issues || []).map((i: SEOIssue) => ({
            severity: i.severity || 'info',
            category: i.category || 'technical',
            description: i.description || '',
            fix: i.fix || '',
          })),
          score: result.score || 0,
          scannedAt: result.scannedAt || Date.now(),
        });
      } catch { /* silent */ }
    }
    setBatchUrls('');
    setShowBatch(false);
    setLoading(false);
  };

  const handleAiScan = async () => {
    if (!url.trim() || aiScanLoading) return;
    setAiScanLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai-scan', url: url.trim() }),
      });
      if (!res.ok) { setAiScanLoading(false); return; }
      const data = await res.json();
      const result = data.result || data;
      // Also add as regular scan
      addScanResult(url.trim(), {
        url: url.trim(),
        title: result.title || '',
        metaDescription: result.metaDescription || '',
        h1: result.h1 || '',
        h2s: result.h2s || [],
        canonicalUrl: result.canonicalUrl || '',
        robotsMeta: result.robotsMeta || '',
        schemaTypes: result.schemaTypes || [],
        pageSize: result.pageSize || 0,
        loadTime: result.loadTime || 0,
        mobileFriendly: result.mobileFriendly ?? true,
        https: result.https ?? url.trim().startsWith('https'),
        issues: (result.issues || []).map((i: SEOIssue) => ({
          severity: i.severity || 'info',
          category: i.category || 'technical',
          description: i.description || '',
          fix: i.fix || '',
        })),
        score: result.score || 0,
        scannedAt: result.scannedAt || Date.now(),
      });
      setSelectedUrl(url.trim());
      setAiInsights(result);
    } catch { /* silent */ }
    setAiScanLoading(false);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const scanEntries = Object.entries(seoScanResults);
    if (scanEntries.length === 0) return;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(seoScanResults, null, 2);
      filename = 'seo-scan-results.json';
      mimeType = 'application/json';
    } else {
      const headers = ['URL', 'Title', 'Score', 'HTTPS', 'Mobile', 'Page Size (KB)', 'Load Time (ms)', 'Issues', 'Scanned At'];
      const rows = scanEntries.map(([, r]) => [
        r.url, r.title, r.score, r.https ? 'Yes' : 'No', r.mobileFriendly ? 'Yes' : 'No',
        r.pageSize, r.loadTime, r.issues.length, new Date(r.scannedAt).toISOString(),
      ].join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = 'seo-scan-results.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scanEntries = Object.entries(seoScanResults);
  const selectedScan = selectedUrl ? seoScanResults[selectedUrl] : null;

  const quickScanPresets = [
    { label: 'Homepage', icon: Home, path: '/' },
    { label: 'About', icon: Info, path: '/about' },
    { label: 'Contact', icon: Mail, path: '/contact' },
    { label: 'Blog', icon: BookMarked, path: '/blog' },
  ];

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Scan size={14} className="text-[#FFB627]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Website Scanner</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleExport('json')} disabled={scanEntries.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[8px] transition-all disabled:opacity-30"
              style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
              <FileJson size={9} /> JSON
            </button>
            <button onClick={() => handleExport('csv')} disabled={scanEntries.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[8px] transition-all disabled:opacity-30"
              style={{ borderColor: '#2E86AB35', color: '#2E86AB' }}>
              <FileSpreadsheet size={9} /> CSV
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="Enter URL to scan (e.g., https://example.com)"
              className={inputCls + ' pl-9'}
            />
          </div>
          <button onClick={() => handleScan()} disabled={loading || !url.trim()}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, #FFB627cc, #FFB62788)' }}>
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Scan size={12} />}
            {loading ? 'Scanning...' : 'Scan'}
          </button>
          <button onClick={handleAiScan} disabled={aiScanLoading || !url.trim()}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
            {aiScanLoading ? <RefreshCw size={12} className="animate-spin" /> : <Brain size={12} />}
            {aiScanLoading ? 'AI Scan...' : 'AI Scan'}
          </button>
        </div>

        {/* Quick Scan Presets */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[8px] text-[#8888aa] uppercase">Quick:</span>
          {quickScanPresets.map(preset => (
            <button key={preset.label} onClick={() => { const base = url.replace(/\/$/, '') || 'https://example.com'; setUrl(base + preset.path); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[8px] transition-all hover:bg-[rgba(157,78,221,0.08)]"
              style={{ borderColor: 'rgba(157,78,221,0.2)', color: '#8888aa' }}>
              <preset.icon size={9} /> {preset.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setShowBatch(!showBatch)}
            className="flex items-center gap-1 px-2 py-1 rounded-md border text-[8px] transition-all"
            style={{ borderColor: '#E8751A35', color: '#E8751A' }}>
            <Upload size={9} /> Batch
          </button>
        </div>

        {/* Batch Input */}
        <AnimatePresence>
          {showBatch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-2">
                <textarea value={batchUrls} onChange={e => setBatchUrls(e.target.value)}
                  placeholder="Enter multiple URLs, comma-separated (e.g., https://site.com/, https://site.com/about, https://site.com/blog)"
                  rows={2} className={inputCls + ' resize-none'} />
                <button onClick={handleBatchScan} disabled={loading || !batchUrls.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #E8751Acc, #E8751A88)' }}>
                  {loading ? <RefreshCw size={10} className="animate-spin" /> : <Bolt size={10} />}
                  {loading ? 'Batch Scanning...' : 'Batch Scan'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Insights Panel */}
      <AnimatePresence>
        {aiInsights && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`${cardCls} p-4 border-[rgba(123,44,191,0.25)]`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Brain size={14} className="text-[#7B2CBF]" />
                  <span className="text-[11px] text-white font-semibold uppercase tracking-wider">AI Deep Analysis</span>
                </div>
                <button onClick={() => setAiInsights(null)} className="text-[#8888aa] hover:text-white"><X size={12} /></button>
              </div>
              {/* Content Analysis */}
              {aiInsights.contentAnalysis && typeof aiInsights.contentAnalysis === 'object' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  {[
                    { label: 'Readability', value: (aiInsights.contentAnalysis as Record<string, number>).readabilityScore || 0, color: '#00ff88' },
                    { label: 'Keyword Density', value: (aiInsights.contentAnalysis as Record<string, number>).keywordDensity || 0, color: '#FFB627' },
                    { label: 'Topical Authority', value: (aiInsights.contentAnalysis as Record<string, number>).topicalAuthority || 0, color: '#7B2CBF' },
                    { label: 'Semantic Relevance', value: (aiInsights.contentAnalysis as Record<string, number>).semanticRelevance || 0, color: '#1B998B' },
                    { label: 'Content Depth', value: (aiInsights.contentAnalysis as Record<string, string>).contentDepth === 'deep' ? 90 : (aiInsights.contentAnalysis as Record<string, string>).contentDepth === 'moderate' ? 60 : 30, color: '#E8751A' },
                  ].map(d => (
                    <div key={d.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2 text-center">
                      <div className="text-[7px] text-[#8888aa] uppercase">{d.label}</div>
                      <div className="text-[10px] font-mono font-bold" style={{ color: d.color }}>{d.value}{d.label === 'Content Depth' ? '' : '/100'}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* AI Insights */}
              {Array.isArray(aiInsights.aiInsights) && (
                <div className="space-y-1 mb-3">
                  <span className="text-[8px] text-[#7B2CBF] uppercase font-bold">AI Insights</span>
                  {(aiInsights.aiInsights as string[]).map((insight: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[9px]">
                      <Lightbulb size={9} className="text-[#7B2CBF] flex-shrink-0 mt-0.5" />
                      <span className="text-[#ccccdd]">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Recommended Actions */}
              {Array.isArray(aiInsights.recommendedActions) && (
                <div className="space-y-1">
                  <span className="text-[8px] text-[#1B998B] uppercase font-bold">Recommended Actions</span>
                  {(aiInsights.recommendedActions as Array<{priority: string; action: string; expectedImpact: string}>).map((ra, i) => (
                    <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                          color: ra.priority === 'high' ? '#ff4444' : ra.priority === 'medium' ? '#FFB627' : '#1B998B',
                          backgroundColor: ra.priority === 'high' ? '#ff444415' : ra.priority === 'medium' ? '#FFB62715' : '#1B998B15',
                        }}>{ra.priority}</span>
                        <span className="text-[9px] text-white font-medium">{ra.action}</span>
                      </div>
                      <div className="text-[8px] text-[#8888aa]">Impact: {ra.expectedImpact}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Previous Scans List */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Scan History</span>
            <span className="text-[9px] font-mono text-[#7B2CBF]">{scanEntries.length} scans</span>
          </div>
          {scanEntries.length === 0 ? (
            <div className="text-[10px] text-[#8888aa] text-center py-8">
              No scans yet. Enter a URL above to start scanning.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {scanEntries.map(([scanUrl, result]) => (
                <button key={scanUrl} onClick={() => setSelectedUrl(scanUrl)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedUrl === scanUrl ? 'border-[#FFB62740] bg-[rgba(255,182,39,0.06)]' : 'border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.2)] hover:bg-[rgba(157,78,221,0.04)]'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white font-medium truncate">{result.title || scanUrl}</div>
                      <div className="text-[9px] text-[#8888aa] truncate flex items-center gap-1">
                        <Clock size={8} /> {result.scannedAt ? new Date(result.scannedAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                    <ScoreRing score={result.score} size={32} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scan Detail */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Eye size={14} className="text-[#1B998B]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Scan Details</span>
          </div>
          {!selectedScan ? (
            <div className="text-[10px] text-[#8888aa] text-center py-8">
              Select a scan to view details
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ScoreRing score={selectedScan.score} size={56} />
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{selectedScan.title || 'No title'}</div>
                  <div className="text-[10px] text-[#8888aa]">{selectedScan.url}</div>
                  <div className="text-[9px] mt-1" style={{ color: getScoreColor(selectedScan.score) }}>{getScoreLabel(selectedScan.score)}</div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'HTTPS', value: selectedScan.https ? '✓ Secure' : '✗ Insecure', color: selectedScan.https ? '#00ff88' : '#ff4444' },
                  { label: 'Mobile', value: selectedScan.mobileFriendly ? '✓ Friendly' : '✗ Not Friendly', color: selectedScan.mobileFriendly ? '#00ff88' : '#ff4444' },
                  { label: 'Page Size', value: `${(selectedScan.pageSize || 0).toLocaleString()} KB`, color: '#FFB627' },
                  { label: 'Load Time', value: `${(selectedScan.loadTime || 0).toLocaleString()} ms`, color: '#1B998B' },
                ].map(d => (
                  <div key={d.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2 text-center">
                    <div className="text-[7px] text-[#8888aa] uppercase">{d.label}</div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: d.color }}>{d.value}</div>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="space-y-1.5">
                <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2">
                  <span className="text-[8px] text-[#8888aa] uppercase">Meta Description</span>
                  <div className="text-[10px] text-[#ccccdd]">{selectedScan.metaDescription || 'None'}</div>
                </div>
                {selectedScan.schemaTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedScan.schemaTypes.map(s => (
                      <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#1B998B25] text-[#1B998B] bg-[#1B998B08]">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Issues */}
              {selectedScan.issues.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Issues ({selectedScan.issues.length})</span>
                  {selectedScan.issues.map((issue, i) => (
                    <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <SeverityBadge severity={issue.severity} />
                        <span className="text-[8px] text-[#8888aa]">{issue.category}</span>
                      </div>
                      <div className="text-[9px] text-[#ccccdd]">{issue.description}</div>
                      <div className="text-[8px] text-[#1B998B] mt-0.5">Fix: {issue.fix}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Silos Tab
// ---------------------------------------------------------------------------

function SilosTab() {
  const { seoSilos, addSEOSilo, removeSEOSilo, updateSEOSilo } = useOSStore();
  const [showCreate, setShowCreate] = useState(false);
  const [siloName, setSiloName] = useState('');
  const [siloKeyword, setSiloKeyword] = useState('');
  const [siloUrl, setSiloUrl] = useState('');
  const [siloDesc, setSiloDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSilo, setExpandedSilo] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!siloName.trim() || !siloKeyword.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-silo', topic: siloName, pillarKeyword: siloKeyword }),
      });
      const data = await res.json();
      const result = data.result || {};
      const now = Date.now();
      const silo: SEOSilo = {
        id: `silo-${now}`,
        name: (result.name as string) || siloName,
        pillarUrl: (result.pillarUrl as string) || `/${siloName.toLowerCase().replace(/\s+/g, '-')}`,
        pillarKeyword: (result.pillarKeyword as string) || siloKeyword,
        description: (result.description as string) || siloDesc || `Content silo for ${siloName}`,
        clusters: ((result.clusters || []) as Array<{ name: string; keyword: string; pages: Array<{ url: string; title: string; metaDescription: string; h1: string; targetKeyword: string; secondaryKeywords: string[]; wordCount: number; status: string }> }>).map((c, ci) => ({
          id: `cluster-${now}-${ci}`,
          siloId: `silo-${now}`,
          name: c.name || `Cluster ${ci + 1}`,
          keyword: c.keyword || siloKeyword,
          pages: (c.pages || []).map((p, pi) => ({
            id: `page-${now}-${ci}-${pi}`,
            clusterId: `cluster-${now}-${ci}`,
            siloId: `silo-${now}`,
            url: p.url || '',
            title: p.title || '',
            metaDescription: p.metaDescription || '',
            h1: p.h1 || '',
            targetKeyword: p.targetKeyword || '',
            secondaryKeywords: p.secondaryKeywords || [],
            wordCount: p.wordCount || 1500,
            score: 0,
            issues: [],
            internalLinks: [],
            status: (p.status || 'draft') as SEOPage['status'],
          })),
          score: 0,
        })),
        score: 0,
        createdAt: now,
        updatedAt: now,
      };
      addSEOSilo(silo);
      setSiloName(''); setSiloKeyword(''); setSiloUrl(''); setSiloDesc('');
      setShowCreate(false);
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">{seoSilos.length} Content Silos</span>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all"
          style={{ borderColor: '#FFB62735', color: '#FFB627', background: '#FFB62708' }}>
          <Plus size={11} /> New Silo
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-[#FFB62725] bg-[rgba(18,18,42,0.8)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-[#FFB627] uppercase tracking-wider font-bold flex items-center gap-1"><Layers size={11} /> Create Content Silo</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8888aa] hover:text-white"><X size={12} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={siloName} onChange={e => setSiloName(e.target.value)} placeholder="Topic (e.g., AI Agent Platform)"
                  className={inputCls} />
                <input value={siloKeyword} onChange={e => setSiloKeyword(e.target.value)} placeholder="Pillar keyword (e.g., AI agent platform)"
                  className={inputCls} />
              </div>
              <input value={siloUrl} onChange={e => setSiloUrl(e.target.value)} placeholder="Pillar URL (e.g., /ai-agent-platform)"
                className={inputCls} />
              <textarea value={siloDesc} onChange={e => setSiloDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                className={inputCls + ' resize-none'} />
              <button onClick={handleCreate} disabled={loading || !siloName.trim() || !siloKeyword.trim()}
                className={btnPrimary}
                style={{ background: 'linear-gradient(135deg, #FFB627cc, #FFB62788)' }}>
                {loading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {loading ? 'Generating Silo...' : 'Generate Silo Structure'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Silo List */}
      {seoSilos.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <Layers size={24} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
          <div className="text-[11px] text-[#8888aa]">No content silos yet. Click &quot;New Silo&quot; to build your first topic cluster.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {seoSilos.map(silo => (
            <div key={silo.id} className={`${cardCls} overflow-hidden`}>
              <button onClick={() => setExpandedSilo(expandedSilo === silo.id ? null : silo.id)}
                className="w-full p-4 flex items-center gap-3 text-left">
                <ScoreRing score={silo.score} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-xs">{silo.name}</div>
                  <div className="text-[9px] text-[#8888aa]">
                    <span className="text-[#FFB627]">{silo.pillarKeyword}</span> · {silo.clusters.length} clusters · {silo.clusters.reduce((s, c) => s + c.pages.length, 0)} pages
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); removeSEOSilo(silo.id); }}
                    className="p-1.5 rounded-lg border border-[#ff444425] text-[#ff4444] hover:bg-[#ff444408] transition-colors" title="Delete">
                    <Trash2 size={11} />
                  </button>
                  {expandedSilo === silo.id ? <ChevronUp size={14} className="text-[#8888aa]" /> : <ChevronDown size={14} className="text-[#8888aa]" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedSilo === silo.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2 border-t border-[rgba(157,78,221,0.1)] pt-3">
                      {/* Pillar Page */}
                      <div className="rounded-lg border border-[#FFB62725] bg-[rgba(255,182,39,0.04)] p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target size={10} className="text-[#FFB627]" />
                          <span className="text-[9px] text-[#FFB627] uppercase font-bold">Pillar Page</span>
                        </div>
                        <div className="text-[10px] text-white font-medium">{silo.pillarUrl}</div>
                        <div className="text-[9px] text-[#8888aa]">Keyword: {silo.pillarKeyword}</div>
                      </div>

                      {/* Clusters */}
                      {silo.clusters.map(cluster => (
                        <div key={cluster.id} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Network size={10} className="text-[#7B2CBF]" />
                            <span className="text-[10px] text-white font-medium">{cluster.name}</span>
                            <span className="text-[8px] text-[#8888aa]">· {cluster.keyword}</span>
                          </div>
                          <div className="space-y-1 pl-4">
                            {cluster.pages.map(page => (
                              <div key={page.id} className="flex items-center gap-2 py-1 border-l-2 border-[rgba(157,78,221,0.15)] pl-3">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  page.status === 'published' ? 'bg-[#00ff88]' : page.status === 'optimized' ? 'bg-[#FFB627]' : 'bg-[#8888aa]'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[9px] text-white truncate">{page.title || page.url}</div>
                                  <div className="text-[8px] text-[#8888aa]">{page.targetKeyword}</div>
                                </div>
                                <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                                  color: page.status === 'published' ? '#00ff88' : page.status === 'optimized' ? '#FFB627' : '#8888aa',
                                  backgroundColor: page.status === 'published' ? '#00ff8815' : page.status === 'optimized' ? '#FFB62715' : '#8888aa15',
                                }}>
                                  {page.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clusters Tab
// ---------------------------------------------------------------------------

function ClustersTab() {
  const { seoSilos, updateSEOSilo } = useOSStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleOptimize = async (siloId: string, clusterId: string, clusterName: string, keyword: string, existingPages: string[]) => {
    setLoading(clusterId);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize-cluster', clusterName, keywords: [keyword], existingPages }),
      });
      const data = await res.json();
      const result = data.result || {};
      updateSEOSilo(siloId, {
        clusters: seoSilos.find(s => s.id === siloId)?.clusters.map(c =>
          c.id === clusterId ? { ...c, score: (result.score as number) || c.score } : c
        ) || [],
      });
    } catch { /* silent */ }
    setLoading(null);
  };

  const allClusters = seoSilos.flatMap(s => s.clusters.map(c => ({ ...c, siloName: s.name, siloId: s.id })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">{allClusters.length} Clusters</span>
      </div>

      {allClusters.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <Network size={24} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
          <div className="text-[11px] text-[#8888aa]">No clusters yet. Create a silo first to generate clusters.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allClusters.map(cluster => (
            <motion.div key={cluster.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`${cardCls} p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white font-semibold text-xs">{cluster.name}</div>
                  <div className="text-[9px] text-[#8888aa]">Silo: {cluster.siloName} · Keyword: {cluster.keyword}</div>
                </div>
                <ScoreRing score={cluster.score} size={32} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#8888aa]">{cluster.pages.length} pages</span>
                <button onClick={() => handleOptimize(cluster.siloId, cluster.id, cluster.name, cluster.keyword, cluster.pages.map(p => p.title))}
                  disabled={loading === cluster.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all disabled:opacity-30"
                  style={{ borderColor: '#7B2CBF35', color: '#7B2CBF' }}>
                  {loading === cluster.id ? <RefreshCw size={9} className="animate-spin" /> : <Sparkles size={9} />}
                  Optimize
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pages Tab
// ---------------------------------------------------------------------------

function PagesTab() {
  const { seoSilos, updateSEOSilo } = useOSStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<{siloId: string; clusterId: string; page: SEOPage} | null>(null);

  const allPages = seoSilos.flatMap(s => s.clusters.flatMap(c => c.pages.map(p => ({ siloId: s.id, siloName: s.name, clusterId: c.id, clusterName: c.name, page: p }))));

  const handleOptimize = async (siloId: string, clusterId: string, page: SEOPage) => {
    setLoading(page.id);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize-page', pageTitle: page.title, url: page.url, targetKeyword: page.targetKeyword, content: page.content }),
      });
      const data = await res.json();
      const result = data.result || {};
      const silo = seoSilos.find(s => s.id === siloId);
      if (!silo) return;
      updateSEOSilo(siloId, {
        clusters: silo.clusters.map(c => c.id === clusterId ? {
          ...c,
          pages: c.pages.map(p => p.id === page.id ? {
            ...p,
            score: (result.score as number) || (result.overallScore as number) || p.score,
            title: (result.optimizedTitle as string) || p.title,
            metaDescription: (result.optimizedMeta as string) || p.metaDescription,
            h1: (result.optimizedH1 as string) || p.h1,
            issues: ((result.issues || []) as SEOIssue[]).map(i => ({
              severity: i.severity || 'info',
              category: i.category || 'content',
              description: i.description || '',
              fix: i.fix || '',
            })),
          } : p),
        } : c),
      });
    } catch { /* silent */ }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">{allPages.length} Pages</span>
      </div>

      {allPages.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <FileText size={24} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
          <div className="text-[11px] text-[#8888aa]">No pages yet. Create a silo first to generate pages.</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {allPages.map(({ siloId, siloName, clusterId, clusterName, page }) => (
            <div key={page.id} className={`${cardCls} p-3`}>
              <div className="flex items-center gap-3">
                <ScoreRing score={page.score} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-[11px] truncate">{page.title || page.url}</div>
                  <div className="text-[9px] text-[#8888aa]">{siloName} / {clusterName} · <span className="text-[#FFB627]">{page.targetKeyword}</span></div>
                  {page.issues.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {page.issues.slice(0, 3).map((issue, i) => <SeverityBadge key={i} severity={issue.severity} />)}
                      {page.issues.length > 3 && <span className="text-[7px] text-[#8888aa]">+{page.issues.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                    color: page.status === 'published' ? '#00ff88' : page.status === 'optimized' ? '#FFB627' : '#8888aa',
                    backgroundColor: page.status === 'published' ? '#00ff8815' : page.status === 'optimized' ? '#FFB62715' : '#8888aa15',
                  }}>
                    {page.status}
                  </span>
                  <button onClick={() => setSelectedPage(selectedPage?.page.id === page.id ? null : { siloId, clusterId, page })}
                    className="p-1.5 rounded-md border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors">
                    <Eye size={10} />
                  </button>
                  <button onClick={() => handleOptimize(siloId, clusterId, page)} disabled={loading === page.id}
                    className="p-1.5 rounded-md border border-[#FFB62725] text-[#FFB627] hover:bg-[#FFB62708] transition-colors disabled:opacity-30" title="Optimize">
                    {loading === page.id ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {selectedPage?.page.id === page.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div><span className="text-[#8888aa]">URL: </span><span className="text-[#ccccdd]">{page.url}</span></div>
                        <div><span className="text-[#8888aa]">H1: </span><span className="text-[#ccccdd]">{page.h1}</span></div>
                        <div><span className="text-[#8888aa]">Meta: </span><span className="text-[#ccccdd]">{page.metaDescription || 'None'}</span></div>
                        <div><span className="text-[#8888aa]">Words: </span><span className="text-[#ccccdd]">{(page.wordCount || 0).toLocaleString()}</span></div>
                      </div>
                      {page.issues.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[8px] text-[#8888aa] uppercase">Issues</span>
                          {page.issues.map((issue, i) => (
                            <div key={i} className="text-[9px] flex items-start gap-1.5">
                              <SeverityBadge severity={issue.severity} />
                              <span className="text-[#ccccdd]">{issue.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Tab — ENHANCED
// ---------------------------------------------------------------------------

const CONTENT_TYPES: ContentType[] = ['blog post', 'landing page', 'product page', 'pillar page', 'how-to guide', 'comparison', 'review', 'FAQ', 'news', 'case study'];

function ContentTab() {
  const { seoSilos, updateSEOSilo } = useOSStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<{siloId: string; clusterId: string; page: SEOPage} | null>(null);

  // AI Content Generator state
  const [genKeyword, setGenKeyword] = useState('');
  const [genContentType, setGenContentType] = useState<ContentType>('blog post');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title?: string; metaDescription?: string; h1?: string; content?: string;
    suggestedInternalLinks?: string[]; wordCount?: number; keywordDensity?: number;
    readabilityScore?: number; contentScore?: { readability: number; keywordDensity: number; headingStructure: number; internalLinks: number; metaTags: number; overall: number };
  } | null>(null);

  // Content Editor state
  const [editorContent, setEditorContent] = useState('');
  const [editorKeyword, setEditorKeyword] = useState('');
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState<Record<string, unknown> | null>(null);

  const allPages = seoSilos.flatMap(s => s.clusters.flatMap(c => c.pages.map(p => ({ siloId: s.id, clusterId: c.id, page: p }))));

  const handleGenerate = async (siloId: string, clusterId: string, page: SEOPage) => {
    setLoading(page.id);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-content-page', pageTitle: page.title, targetKeyword: page.targetKeyword, secondaryKeywords: page.secondaryKeywords }),
      });
      const data = await res.json();
      const result = data.result || {};
      const silo = seoSilos.find(s => s.id === siloId);
      if (!silo) return;
      updateSEOSilo(siloId, {
        clusters: silo.clusters.map(c => c.id === clusterId ? {
          ...c,
          pages: c.pages.map(p => p.id === page.id ? {
            ...p,
            content: (result.content as string) || p.content,
            title: (result.title as string) || p.title,
            metaDescription: (result.metaDescription as string) || p.metaDescription,
            h1: (result.h1 as string) || p.h1,
            status: 'optimized' as const,
          } : p),
        } : c),
      });
    } catch { /* silent */ }
    setLoading(null);
  };

  const handleAiGenerate = async () => {
    if (!genKeyword.trim() || genLoading) return;
    setGenLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-content', targetKeyword: genKeyword, contentType: genContentType }),
      });
      const data = await res.json();
      setGeneratedContent(data.result || null);
      if (data.result?.content) {
        setEditorContent(data.result.content as string);
        setEditorKeyword(genKeyword);
      }
    } catch { /* silent */ }
    setGenLoading(false);
  };

  const handleOptimizeContent = async () => {
    if (!editorContent.trim() || optLoading) return;
    setOptLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seo-scoring', layerName: editorKeyword || 'Content', layerDescription: editorContent.slice(0, 200), keywords: [editorKeyword], content: editorContent }),
      });
      const data = await res.json();
      setOptResult(data.result || null);
    } catch { /* silent */ }
    setOptLoading(false);
  };

  const handlePublish = (siloId: string, clusterId: string, page: SEOPage) => {
    const silo = seoSilos.find(s => s.id === siloId);
    if (!silo) return;
    updateSEOSilo(siloId, {
      clusters: silo.clusters.map(c => c.id === clusterId ? {
        ...c,
        pages: c.pages.map(p => p.id === page.id ? { ...p, status: 'published' as const, publishedAt: Date.now() } : p),
      } : c),
    });
  };

  // Word count and keyword density for editor
  const wordCount = useMemo(() => editorContent.split(/\s+/).filter(Boolean).length, [editorContent]);
  const keywordCount = useMemo(() => {
    if (!editorKeyword.trim() || !editorContent) return 0;
    const regex = new RegExp(editorKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (editorContent.match(regex) || []).length;
  }, [editorContent, editorKeyword]);
  const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* AI Content Generator */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={14} className="text-[#7B2CBF]" />
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">AI Content Generator</span>
        </div>
        <div className="flex items-end gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[8px] text-[#8888aa] uppercase mb-1 block">Target Keyword</label>
            <input value={genKeyword} onChange={e => setGenKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
              placeholder="e.g., AI agent platform" className={inputCls} />
          </div>
          <div className="w-44">
            <label className="text-[8px] text-[#8888aa] uppercase mb-1 block">Content Type</label>
            <select value={genContentType} onChange={e => setGenContentType(e.target.value as ContentType)}
              className={inputCls + ' appearance-none cursor-pointer'}>
              {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </div>
          <button onClick={handleAiGenerate} disabled={genLoading || !genKeyword.trim()}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
            {genLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {genLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Generated Content Preview */}
        <AnimatePresence>
          {generatedContent && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-lg border border-[rgba(123,44,191,0.2)] bg-[rgba(10,10,26,0.3)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#7B2CBF] uppercase font-bold">Generated Content</span>
                  <button onClick={() => setGeneratedContent(null)} className="text-[#8888aa] hover:text-white"><X size={10} /></button>
                </div>
                {generatedContent.title && <div className="text-[10px] text-white font-medium">Title: {generatedContent.title}</div>}
                {generatedContent.metaDescription && <div className="text-[9px] text-[#8888aa]">Meta: {generatedContent.metaDescription}</div>}
                {generatedContent.contentScore && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { label: 'Readability', value: generatedContent.contentScore.readability, color: '#00ff88' },
                      { label: 'KW Density', value: generatedContent.contentScore.keywordDensity, color: '#FFB627' },
                      { label: 'Headings', value: generatedContent.contentScore.headingStructure, color: '#7B2CBF' },
                      { label: 'Int. Links', value: generatedContent.contentScore.internalLinks, color: '#1B998B' },
                      { label: 'Meta Tags', value: generatedContent.contentScore.metaTags, color: '#E8751A' },
                      { label: 'Overall', value: generatedContent.contentScore.overall, color: getScoreColor(generatedContent.contentScore.overall) },
                    ].map(s => (
                      <div key={s.label} className="rounded-md border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.2)] p-1.5 text-center">
                        <div className="text-[7px] text-[#8888aa] uppercase">{s.label}</div>
                        <div className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
                  <span>{generatedContent.wordCount || wordCount} words</span>
                  <span>·</span>
                  <span>KW Density: {generatedContent.keywordDensity || keywordDensity}%</span>
                  <span>·</span>
                  <span>Readability: {generatedContent.readabilityScore || '—'}</span>
                </div>
                <button onClick={() => { setEditorContent(generatedContent.content || ''); setEditorKeyword(genKeyword); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all"
                  style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
                  <Edit3 size={9} /> Edit in Content Editor
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Editor */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Edit3 size={14} className="text-[#1B998B]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Content Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-[#8888aa]">{wordCount} words</span>
            <span className="text-[8px] font-mono text-[#FFB627]">KW: {keywordDensity}%</span>
            <button onClick={handleOptimizeContent} disabled={optLoading || !editorContent.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all disabled:opacity-30"
              style={{ borderColor: '#FFB62735', color: '#FFB627' }}>
              {optLoading ? <RefreshCw size={9} className="animate-spin" /> : <Wrench size={9} />}
              Optimize
            </button>
          </div>
        </div>
        <input value={editorKeyword} onChange={e => setEditorKeyword(e.target.value)}
          placeholder="Target keyword for density check" className={inputCls + ' mb-2'} />
        <textarea value={editorContent} onChange={e => setEditorContent(e.target.value)}
          placeholder="Paste or write content here. Use the AI Content Generator above to get started..."
          rows={8} className={inputCls + ' resize-none font-mono text-[10px] leading-relaxed'} />

        {/* Optimization Result */}
        <AnimatePresence>
          {optResult && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
              <div className="rounded-lg border border-[rgba(255,182,39,0.2)] bg-[rgba(10,10,26,0.3)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#FFB627] uppercase font-bold">Content Score</span>
                  <button onClick={() => setOptResult(null)} className="text-[#8888aa] hover:text-white"><X size={10} /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { label: 'Readability', value: (optResult.contentScore as Record<string, number>)?.readability || (optResult.readabilityScore as number) || 0, color: '#00ff88' },
                    { label: 'KW Density', value: (optResult.contentScore as Record<string, number>)?.keywordDensity || (optResult.keywordDensity as number) || 0, color: '#FFB627' },
                    { label: 'Headings', value: (optResult.contentScore as Record<string, number>)?.headingStructure || 0, color: '#7B2CBF' },
                    { label: 'Int. Links', value: (optResult.contentScore as Record<string, number>)?.internalLinks || 0, color: '#1B998B' },
                    { label: 'Meta Tags', value: (optResult.contentScore as Record<string, number>)?.metaTags || (optResult.metaScore as number) || 0, color: '#E8751A' },
                  ].map(s => (
                    <div key={s.label} className="rounded-md border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.2)] p-1.5 text-center">
                      <div className="text-[7px] text-[#8888aa] uppercase">{s.label}</div>
                      <div className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {Array.isArray(optResult.issues) && (optResult.issues as SEOIssue[]).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {(optResult.issues as SEOIssue[]).slice(0, 5).map((issue, i) => (
                      <div key={i} className="text-[8px] flex items-start gap-1.5">
                        <SeverityBadge severity={issue.severity} />
                        <span className="text-[#ccccdd]">{issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Page Content List */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Page Content ({allPages.length})</span>
      </div>
      {allPages.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <PenTool size={24} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
          <div className="text-[11px] text-[#8888aa]">No pages to generate content for. Create a silo first.</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {allPages.map(({ siloId, clusterId, page }) => (
            <div key={page.id} className={`${cardCls} p-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  page.status === 'published' ? 'bg-[#00ff88]' : page.status === 'optimized' ? 'bg-[#FFB627]' : 'bg-[#8888aa]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-[11px] truncate">{page.title || page.url}</div>
                  <div className="text-[9px] text-[#8888aa]">{page.targetKeyword} · {page.status} · {(page.wordCount || 0).toLocaleString()} words</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleGenerate(siloId, clusterId, page)} disabled={loading === page.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all disabled:opacity-30"
                    style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
                    {loading === page.id ? <RefreshCw size={9} className="animate-spin" /> : <Sparkles size={9} />}
                    Generate
                  </button>
                  {page.content && (
                    <button onClick={() => setPreviewPage(previewPage?.page.id === page.id ? null : { siloId, clusterId, page })}
                      className="p-1.5 rounded-md border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors" title="Preview">
                      <Eye size={10} />
                    </button>
                  )}
                  {page.status === 'optimized' && (
                    <button onClick={() => handlePublish(siloId, clusterId, page)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all"
                      style={{ borderColor: '#00ff8835', color: '#00ff88' }}>
                      <Send size={9} /> Publish
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {previewPage?.page.id === page.id && page.content && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)]">
                      <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-3 max-h-64 overflow-y-auto">
                        <div className="text-[10px] text-[#ccccdd] whitespace-pre-wrap leading-relaxed">{page.content}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links Tab — ENHANCED
// ---------------------------------------------------------------------------

function LinksTab() {
  const { seoSilos, updateSEOSilo } = useOSStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<{[key: string]: Array<{from: string; to: string; anchorText: string; reason: string}>}>({});
  const [linkHealth, setLinkHealth] = useState<Record<string, unknown> | null>(null);
  const [linkHealthLoading, setLinkHealthLoading] = useState(false);
  const [activeLinkSubtab, setActiveLinkSubtab] = useState<'internal' | 'external' | 'health' | 'anchor'>('internal');

  const handleSuggest = async (silo: SEOSilo) => {
    setLoading(silo.id);
    try {
      const pages = silo.clusters.flatMap(c => c.pages.map(p => ({ url: p.url, title: p.title, keyword: p.targetKeyword })));
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-links', siloName: silo.name, pages }),
      });
      const data = await res.json();
      const result = data.result || {};
      setLinkSuggestions(prev => ({ ...prev, [silo.id]: (result.links || []) as Array<{from: string; to: string; anchorText: string; reason: string}> }));
    } catch { /* silent */ }
    setLoading(null);
  };

  const handleCheckLinks = async () => {
    if (linkHealthLoading) return;
    setLinkHealthLoading(true);
    try {
      const allPages = seoSilos.flatMap(s => s.clusters.flatMap(c => c.pages.map(p => ({ url: p.url, title: p.title }))));
      if (allPages.length === 0) { setLinkHealthLoading(false); return; }
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-links', pages: allPages }),
      });
      const data = await res.json();
      setLinkHealth(data.result || null);
    } catch { /* silent */ }
    setLinkHealthLoading(false);
  };

  // Build internal link map from silos
  const internalLinkMap = useMemo(() => {
    const map: Array<{from: string; to: string; anchorText: string; siloName: string}> = [];
    seoSilos.forEach(silo => {
      const pages = silo.clusters.flatMap(c => c.pages);
      pages.forEach(page => {
        (page.internalLinks || []).forEach(link => {
          map.push({ from: page.url, to: link, anchorText: page.targetKeyword, siloName: silo.name });
        });
      });
    });
    return map;
  }, [seoSilos]);

  const subtabs: Array<{id: typeof activeLinkSubtab; label: string; icon: typeof Link2}> = [
    { id: 'internal', label: 'Internal', icon: Link2 },
    { id: 'external', label: 'External', icon: ExternalLink },
    { id: 'health', label: 'Health', icon: Shield },
    { id: 'anchor', label: 'Anchor Text', icon: Target },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1">
        {subtabs.map(st => (
          <button key={st.id} onClick={() => setActiveLinkSubtab(st.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
              activeLinkSubtab === st.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={activeLinkSubtab === st.id ? { background: '#1B998B15', border: '1px solid #1B998B30' } : { border: '1px solid transparent' }}>
            <st.icon size={10} style={{ color: activeLinkSubtab === st.id ? '#1B998B' : '#8888aa' }} />
            {st.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleCheckLinks} disabled={linkHealthLoading || seoSilos.length === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#ff444435', color: '#ff4444' }}>
          {linkHealthLoading ? <RefreshCw size={10} className="animate-spin" /> : <Shield size={10} />}
          Check Links
        </button>
      </div>

      {/* Internal Links */}
      {activeLinkSubtab === 'internal' && (
        <div className="space-y-3">
          {seoSilos.length === 0 ? (
            <div className={`${cardCls} p-8 text-center`}>
              <Link2 size={24} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
              <div className="text-[11px] text-[#8888aa]">No silos to analyze links for. Create a silo first.</div>
            </div>
          ) : (
            seoSilos.map(silo => (
              <div key={silo.id} className={`${cardCls} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold text-xs">{silo.name}</div>
                    <div className="text-[9px] text-[#8888aa]">{silo.clusters.reduce((s, c) => s + c.pages.length, 0)} pages to link</div>
                  </div>
                  <button onClick={() => handleSuggest(silo)} disabled={loading === silo.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30"
                    style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
                    {loading === silo.id ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Suggest Links
                  </button>
                </div>
                {linkSuggestions[silo.id]?.length ? (
                  <div className="space-y-1.5">
                    {linkSuggestions[silo.id].map((link, i) => (
                      <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2.5 flex items-center gap-2">
                        <ArrowRight size={10} className="text-[#1B998B] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] text-[#ccccdd]">
                            <span className="text-[#FFB627]">{link.from}</span>
                            <span className="text-[#8888aa]"> → </span>
                            <span className="text-[#00ff88]">{link.to}</span>
                          </div>
                          <div className="text-[8px] text-[#8888aa]">Anchor: &quot;{link.anchorText}&quot; · {link.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[9px] text-[#8888aa] text-center py-3">Click &quot;Suggest Links&quot; to generate internal linking recommendations</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* External Links */}
      {activeLinkSubtab === 'external' && (
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <ExternalLink size={14} className="text-[#E8751A]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">External Link Monitor</span>
          </div>
          {linkHealth && Array.isArray(linkHealth.externalLinks) ? (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {(linkHealth.externalLinks as Array<{from: string; to: string; anchorText: string; status: string; risk: string}>).map((link, i) => (
                <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2.5 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${link.status === 'healthy' ? 'bg-[#00ff88]' : link.status === 'broken' ? 'bg-[#ff4444]' : 'bg-[#FFB627]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] text-[#ccccdd] truncate">{link.to}</div>
                    <div className="text-[8px] text-[#8888aa]">From: {link.from} · Anchor: &quot;{link.anchorText}&quot;</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                      color: link.status === 'healthy' ? '#00ff88' : link.status === 'broken' ? '#ff4444' : '#FFB627',
                      backgroundColor: link.status === 'healthy' ? '#00ff8815' : link.status === 'broken' ? '#ff444415' : '#FFB62715',
                    }}>{link.status}</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                      color: link.risk === 'low' ? '#1B998B' : link.risk === 'high' ? '#ff4444' : '#FFB627',
                      backgroundColor: link.risk === 'low' ? '#1B998B15' : link.risk === 'high' ? '#ff444415' : '#FFB62715',
                    }}>{link.risk} risk</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[9px] text-[#8888aa] text-center py-8">Click &quot;Check Links&quot; to analyze external links and their status</div>
          )}
        </div>
      )}

      {/* Link Health */}
      {activeLinkSubtab === 'health' && (
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Shield size={14} className="text-[#ff4444]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Link Health Checker</span>
          </div>
          {linkHealth ? (
            <div className="space-y-3">
              {Array.isArray(linkHealth.brokenLinks) && (linkHealth.brokenLinks as Array<{url: string; status: string; foundOn: string; anchorText: string}>).length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Unlink size={10} className="text-[#ff4444]" />
                    <span className="text-[9px] text-[#ff4444] uppercase font-bold">Broken Links ({(linkHealth.brokenLinks as unknown[]).length})</span>
                  </div>
                  {(linkHealth.brokenLinks as Array<{url: string; status: string; foundOn: string; anchorText: string}>).map((bl, i) => (
                    <div key={i} className="rounded-lg border border-[rgba(255,68,68,0.15)] bg-[rgba(255,68,68,0.04)] p-2.5">
                      <div className="text-[9px] text-white font-medium">{bl.url}</div>
                      <div className="text-[8px] text-[#8888aa]">Status: <span className="text-[#ff4444]">{bl.status}</span> · Found on: {bl.foundOn} · Anchor: &quot;{bl.anchorText}&quot;</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-3 rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)]">
                  <CheckCircle2 size={12} className="text-[#00ff88]" />
                  <span className="text-[9px] text-[#00ff88]">No broken links detected!</span>
                </div>
              )}
              {linkHealth.orphanPages && Array.isArray(linkHealth.orphanPages) && (linkHealth.orphanPages as string[]).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-[#FFB627] uppercase font-bold">Orphan Pages</span>
                  {(linkHealth.orphanPages as string[]).map((op, i) => (
                    <div key={i} className="text-[9px] text-[#ccccdd] flex items-center gap-1.5">
                      <AlertTriangle size={9} className="text-[#FFB627]" /> {op}
                    </div>
                  ))}
                </div>
              )}
              {linkHealth.linkJuiceFlow && typeof linkHealth.linkJuiceFlow === 'object' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[rgba(0,255,136,0.1)] bg-[rgba(0,255,136,0.04)] p-2.5">
                    <span className="text-[8px] text-[#00ff88] uppercase font-bold">Strong Link Flow</span>
                    {(Array.isArray((linkHealth.linkJuiceFlow as Record<string, string[]>).strong) ? (linkHealth.linkJuiceFlow as Record<string, string[]>).strong : []).map((u, i) => (
                      <div key={i} className="text-[8px] text-[#ccccdd]">{u}</div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-[rgba(255,182,39,0.1)] bg-[rgba(255,182,39,0.04)] p-2.5">
                    <span className="text-[8px] text-[#FFB627] uppercase font-bold">Weak Link Flow</span>
                    {(Array.isArray((linkHealth.linkJuiceFlow as Record<string, string[]>).weak) ? (linkHealth.linkJuiceFlow as Record<string, string[]>).weak : []).map((u, i) => (
                      <div key={i} className="text-[8px] text-[#ccccdd]">{u}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[9px] text-[#8888aa] text-center py-8">Click &quot;Check Links&quot; to scan for broken links and link health issues</div>
          )}
        </div>
      )}

      {/* Anchor Text Analysis */}
      {activeLinkSubtab === 'anchor' && (
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Target size={14} className="text-[#7B2CBF]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Anchor Text Analysis</span>
          </div>
          {linkHealth && linkHealth.anchorTextAnalysis && typeof linkHealth.anchorTextAnalysis === 'object' ? (
            <div className="space-y-3">
              {/* Distribution */}
              {((linkHealth.anchorTextAnalysis as Record<string, unknown>).distribution as Record<string, number>) && (
                <div className="space-y-2">
                  <span className="text-[9px] text-[#8888aa] uppercase font-bold">Distribution</span>
                  {[
                    { label: 'Exact Match', value: ((linkHealth.anchorTextAnalysis as Record<string, unknown>).distribution as Record<string, number>).exact_match || 0, color: '#7B2CBF' },
                    { label: 'Partial Match', value: ((linkHealth.anchorTextAnalysis as Record<string, unknown>).distribution as Record<string, number>).partial_match || 0, color: '#FFB627' },
                    { label: 'Branded', value: ((linkHealth.anchorTextAnalysis as Record<string, unknown>).distribution as Record<string, number>).branded || 0, color: '#1B998B' },
                    { label: 'Generic', value: ((linkHealth.anchorTextAnalysis as Record<string, unknown>).distribution as Record<string, number>).generic || 0, color: '#8888aa' },
                  ].map(d => (
                    <ProgressBar key={d.label} label={d.label} value={d.value} color={d.color} />
                  ))}
                </div>
              )}
              {/* Over-optimized */}
              {Array.isArray((linkHealth.anchorTextAnalysis as Record<string, unknown>).overOptimized) && ((linkHealth.anchorTextAnalysis as Record<string, unknown>).overOptimized as string[]).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[8px] text-[#ff4444] uppercase font-bold">Over-Optimized Anchors</span>
                  {((linkHealth.anchorTextAnalysis as Record<string, unknown>).overOptimized as string[]).map((kw, i) => (
                    <div key={i} className="text-[9px] text-[#ccccdd] flex items-center gap-1.5">
                      <AlertTriangle size={9} className="text-[#ff4444]" /> {kw}
                    </div>
                  ))}
                </div>
              )}
              {/* Generic */}
              {Array.isArray((linkHealth.anchorTextAnalysis as Record<string, unknown>).generic) && (
                <div className="space-y-1">
                  <span className="text-[8px] text-[#FFB627] uppercase font-bold">Generic Anchors (Replace)</span>
                  {((linkHealth.anchorTextAnalysis as Record<string, unknown>).generic as string[]).map((kw, i) => (
                    <div key={i} className="text-[9px] text-[#ccccdd] flex items-center gap-1.5">
                      <Info size={9} className="text-[#FFB627]" /> &quot;{kw}&quot; — use keyword-rich anchor instead
                    </div>
                  ))}
                </div>
              )}
              {/* Branded */}
              {Array.isArray((linkHealth.anchorTextAnalysis as Record<string, unknown>).branded) && (
                <div className="space-y-1">
                  <span className="text-[8px] text-[#1B998B] uppercase font-bold">Branded Anchors</span>
                  {((linkHealth.anchorTextAnalysis as Record<string, unknown>).branded as string[]).map((kw, i) => (
                    <div key={i} className="text-[9px] text-[#ccccdd] flex items-center gap-1.5">
                      <CheckCircle2 size={9} className="text-[#1B998B]" /> {kw}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[9px] text-[#8888aa] text-center py-8">Click &quot;Check Links&quot; to analyze anchor text distribution</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Competitors Tab — ENHANCED
// ---------------------------------------------------------------------------

function CompetitorsTab() {
  const { seoSilos } = useOSStore();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    competitors?: Array<{name: string; strength: string; weakness: string; rankingKeywords: string[]}>;
    opportunities?: string[];
    threats?: string[];
    recommendedStrategy?: string;
  } | null>(null);

  // New: Competitor URL analysis
  const [compUrl, setCompUrl] = useState('');
  const [compUrlLoading, setCompUrlLoading] = useState(false);
  const [compUrlResult, setCompUrlResult] = useState<Record<string, unknown> | null>(null);

  // Content gaps
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsResult, setGapsResult] = useState<Record<string, unknown> | null>(null);

  // Side-by-side view
  const [showComparison, setShowComparison] = useState(false);

  const handleAnalyze = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-competitors', topic, keywords: topic.split(/\s+/).slice(0, 5) }),
      });
      const data = await res.json();
      setResult(data.result || null);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleAnalyzeCompetitorUrl = async () => {
    if (!compUrl.trim() || compUrlLoading) return;
    setCompUrlLoading(true);
    try {
      const ourKeywords = seoSilos.flatMap(s => [s.pillarKeyword, ...s.clusters.map(c => c.keyword)]);
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-competitor-url', url: compUrl.trim(), keywords: ourKeywords.length > 0 ? ourKeywords : topic.split(/\s+/) }),
      });
      const data = await res.json();
      setCompUrlResult(data.result || null);
    } catch { /* silent */ }
    setCompUrlLoading(false);
  };

  const handleFindContentGaps = async () => {
    if (gapsLoading) return;
    setGapsLoading(true);
    try {
      const ourKeywords = seoSilos.flatMap(s => [s.pillarKeyword, ...s.clusters.map(c => c.keyword)]);
      const competitorKeywords = (compUrlResult?.topKeywords as Array<{keyword: string}>)?.map(k => k.keyword) || topic.split(/\s+/);
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'content-gaps',
          keywords: ourKeywords.length > 0 ? ourKeywords : ['AI agent', 'agentic AI'],
          secondaryKeywords: competitorKeywords,
        }),
      });
      const data = await res.json();
      setGapsResult(data.result || null);
    } catch { /* silent */ }
    setGapsLoading(false);
  };

  const defaultTopic = seoSilos.length > 0 ? seoSilos[0].pillarKeyword : '';

  return (
    <div className="space-y-4">
      {/* Topic Analysis */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center gap-1.5 mb-3">
          <Users size={14} className="text-[#E8751A]" />
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Competitor Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder={defaultTopic ? `e.g., ${defaultTopic}` : "Enter topic or keyword"}
            className={inputCls + ' flex-1'} />
          <button onClick={handleAnalyze} disabled={loading || !topic.trim()}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, #E8751Acc, #E8751A88)' }}>
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Users size={12} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Competitor URL Input */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center gap-1.5 mb-3">
          <Globe size={14} className="text-[#7B2CBF]" />
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Analyze Competitor URL</span>
        </div>
        <div className="flex items-center gap-2">
          <input value={compUrl} onChange={e => setCompUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnalyzeCompetitorUrl()}
            placeholder="https://competitor.com"
            className={inputCls + ' flex-1'} />
          <button onClick={handleAnalyzeCompetitorUrl} disabled={compUrlLoading || !compUrl.trim()}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
            {compUrlLoading ? <RefreshCw size={12} className="animate-spin" /> : <Globe size={12} />}
            {compUrlLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Competitor URL Result */}
      {compUrlResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Domain Authority & Backlinks */}
            <div className={`${cardCls} p-4`}>
              <h4 className="text-[10px] text-[#7B2CBF] uppercase font-bold mb-3 flex items-center gap-1"><Award size={10} /> Domain Intelligence</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ScoreRing score={(compUrlResult.estimatedDomainAuthority as number) || 0} size={48} />
                  <div>
                    <div className="text-[9px] text-[#8888aa] uppercase">Domain Authority</div>
                    <div className="text-sm font-mono font-bold" style={{ color: getScoreColor((compUrlResult.estimatedDomainAuthority as number) || 0) }}>
                      {(compUrlResult.estimatedDomainAuthority as number) || 0}
                    </div>
                  </div>
                </div>
                {compUrlResult.backlinkProfile && typeof compUrlResult.backlinkProfile === 'object' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2 text-center">
                      <div className="text-[7px] text-[#8888aa] uppercase">Ref. Domains</div>
                      <div className="text-[10px] font-mono font-bold text-[#1B998B]">{(compUrlResult.backlinkProfile as Record<string, unknown>).estimatedReferringDomains || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2 text-center">
                      <div className="text-[7px] text-[#8888aa] uppercase">Backlinks</div>
                      <div className="text-[10px] font-mono font-bold text-[#E8751A]">{(compUrlResult.backlinkProfile as Record<string, unknown>).estimatedBacklinks || '—'}</div>
                    </div>
                  </div>
                )}
                {/* Strengths & Weaknesses */}
                {Array.isArray(compUrlResult.strengths) && (
                  <div className="space-y-1">
                    <span className="text-[8px] text-[#00ff88] uppercase font-bold">Strengths</span>
                    {(compUrlResult.strengths as string[]).map((s, i) => (
                      <div key={i} className="text-[8px] text-[#ccccdd] flex items-start gap-1"><CheckCircle2 size={8} className="text-[#00ff88] flex-shrink-0 mt-0.5" />{s}</div>
                    ))}
                  </div>
                )}
                {Array.isArray(compUrlResult.weaknesses) && (
                  <div className="space-y-1">
                    <span className="text-[8px] text-[#ff4444] uppercase font-bold">Weaknesses</span>
                    {(compUrlResult.weaknesses as string[]).map((w, i) => (
                      <div key={i} className="text-[8px] text-[#ccccdd] flex items-start gap-1"><XCircle size={8} className="text-[#ff4444] flex-shrink-0 mt-0.5" />{w}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Keywords */}
            <div className={`${cardCls} p-4`}>
              <h4 className="text-[10px] text-[#E8751A] uppercase font-bold mb-3 flex items-center gap-1"><Target size={10} /> Top Keywords</h4>
              {Array.isArray(compUrlResult.topKeywords) ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(compUrlResult.topKeywords as Array<{keyword: string; estimatedPosition: number; estimatedVolume: string}>).map((kw, i) => (
                    <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-white font-medium">{kw.keyword}</div>
                        <div className="text-[8px] text-[#8888aa]">Position: ~{kw.estimatedPosition}</div>
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                        color: kw.estimatedVolume === 'high' ? '#00ff88' : kw.estimatedVolume === 'medium' ? '#FFB627' : '#8888aa',
                        backgroundColor: kw.estimatedVolume === 'high' ? '#00ff8815' : kw.estimatedVolume === 'medium' ? '#FFB62715' : '#8888aa15',
                      }}>{kw.estimatedVolume}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-[9px] text-[#8888aa]">No keyword data</div>}

              {/* Content Strategy */}
              {compUrlResult.contentStrategy && typeof compUrlResult.contentStrategy === 'object' && (
                <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] space-y-1.5">
                  <span className="text-[8px] text-[#1B998B] uppercase font-bold">Content Strategy</span>
                  <div className="grid grid-cols-2 gap-2 text-[8px]">
                    <div><span className="text-[#8888aa]">Avg Words:</span> <span className="text-[#ccccdd]">{(compUrlResult.contentStrategy as Record<string, unknown>).averageWordCount || '—'}</span></div>
                    <div><span className="text-[#8888aa]">Frequency:</span> <span className="text-[#ccccdd]">{(compUrlResult.contentStrategy as Record<string, unknown>).publishingFrequency || '—'}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Topic Analysis Results */}
      {result && (
        <div className="space-y-3">
          {/* Competitor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(result.competitors || []).map((comp, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${cardCls} p-4`}>
                <h4 className="text-white font-medium text-xs mb-2">{comp.name}</h4>
                <div className="space-y-1.5 text-[9px]">
                  <div><span className="text-[#00ff88]">Strength:</span> <span className="text-[#ccccdd]">{comp.strength}</span></div>
                  <div><span className="text-[#ff4444]">Weakness:</span> <span className="text-[#ccccdd]">{comp.weakness}</span></div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comp.rankingKeywords.map(kw => (
                      <span key={kw} className="text-[7px] px-1.5 py-0.5 rounded-full border border-[#E8751A25] text-[#E8751A]">{kw}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Opportunities & Threats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)] p-4">
              <h4 className="text-[10px] text-[#00ff88] uppercase font-bold mb-2">Opportunities</h4>
              {(result.opportunities || []).map((o, i) => (
                <div key={i} className="text-[9px] text-[#ccccdd] flex items-start gap-1.5 mb-1.5">
                  <ArrowUpRight size={9} className="text-[#00ff88] flex-shrink-0 mt-0.5" />{o}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[rgba(230,57,70,0.15)] bg-[rgba(230,57,70,0.04)] p-4">
              <h4 className="text-[10px] text-[#ff4444] uppercase font-bold mb-2">Threats</h4>
              {(result.threats || []).map((t, i) => (
                <div key={i} className="text-[9px] text-[#ccccdd] flex items-start gap-1.5 mb-1.5">
                  <AlertTriangle size={9} className="text-[#ff4444] flex-shrink-0 mt-0.5" />{t}
                </div>
              ))}
            </div>
          </div>

          {result.recommendedStrategy && (
            <div className={`${cardCls} p-4`}>
              <h4 className="text-[10px] text-[#FFB627] uppercase font-bold mb-2">Recommended Strategy</h4>
              <div className="text-[10px] text-[#ccccdd] leading-relaxed">{result.recommendedStrategy}</div>
            </div>
          )}
        </div>
      )}

      {/* Content Gaps */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Swords size={14} className="text-[#1B998B]" />
            <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Content Gaps</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[8px] font-medium transition-all"
              style={{ borderColor: '#2E86AB35', color: '#2E86AB' }}>
              <ArrowLeftRight size={9} /> {showComparison ? 'Hide' : 'Compare'}
            </button>
            <button onClick={handleFindContentGaps} disabled={gapsLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30"
              style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
              {gapsLoading ? <RefreshCw size={10} className="animate-spin" /> : <Swords size={10} />}
              Find Content Gaps
            </button>
          </div>
        </div>

        {gapsResult ? (
          <div className="space-y-3">
            {Array.isArray(gapsResult.gaps) && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {(gapsResult.gaps as Array<{keyword: string; difficulty: string; searchVolume: string; contentSuggestion: string; priority: string; competitorRanksFor: boolean}>).map((gap, i) => (
                  <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-2.5 flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gap.priority === 'high' ? 'bg-[#ff4444]' : gap.priority === 'medium' ? 'bg-[#FFB627]' : 'bg-[#1B998B]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-white font-medium">{gap.keyword}</div>
                      <div className="text-[8px] text-[#8888aa]">{gap.contentSuggestion}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                        color: gap.difficulty === 'low' ? '#00ff88' : gap.difficulty === 'medium' ? '#FFB627' : '#ff4444',
                        backgroundColor: gap.difficulty === 'low' ? '#00ff8815' : gap.difficulty === 'medium' ? '#FFB62715' : '#ff444415',
                      }}>{gap.difficulty}</span>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                        color: gap.searchVolume === 'high' ? '#00ff88' : gap.searchVolume === 'medium' ? '#FFB627' : '#8888aa',
                        backgroundColor: gap.searchVolume === 'high' ? '#00ff8815' : gap.searchVolume === 'medium' ? '#FFB62715' : '#8888aa15',
                      }}>{gap.searchVolume}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {gapsResult.strategy && (
              <div className="rounded-lg border border-[rgba(27,153,139,0.15)] bg-[rgba(27,153,139,0.04)] p-2.5">
                <span className="text-[8px] text-[#1B998B] uppercase font-bold">Strategy</span>
                <div className="text-[9px] text-[#ccccdd]">{gapsResult.strategy as string}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[9px] text-[#8888aa] text-center py-4">Click &quot;Find Content Gaps&quot; to identify keyword opportunities gaps</div>
        )}

        {/* Side-by-side comparison */}
        <AnimatePresence>
          {showComparison && gapsResult && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)] p-3">
                  <span className="text-[9px] text-[#00ff88] uppercase font-bold block mb-2">Our Keywords</span>
                  {Array.isArray(gapsResult.uniqueToUs) && (gapsResult.uniqueToUs as string[]).map((kw, i) => (
                    <div key={i} className="text-[8px] text-[#ccccdd] flex items-center gap-1 mb-0.5"><Check size={8} className="text-[#00ff88]" />{kw}</div>
                  ))}
                  {Array.isArray(gapsResult.overlappingKeywords) && (gapsResult.overlappingKeywords as string[]).map((kw, i) => (
                    <div key={`o-${i}`} className="text-[8px] text-[#FFB627] flex items-center gap-1 mb-0.5"><ArrowLeftRight size={8} />{kw}</div>
                  ))}
                </div>
                <div className="rounded-lg border border-[rgba(255,68,68,0.15)] bg-[rgba(255,68,68,0.04)] p-3">
                  <span className="text-[9px] text-[#ff4444] uppercase font-bold block mb-2">Competitor Keywords</span>
                  {Array.isArray(gapsResult.uniqueToCompetitor) && (gapsResult.uniqueToCompetitor as string[]).map((kw, i) => (
                    <div key={i} className="text-[8px] text-[#ccccdd] flex items-center gap-1 mb-0.5"><X size={8} className="text-[#ff4444]" />{kw}</div>
                  ))}
                  {Array.isArray(gapsResult.overlappingKeywords) && (gapsResult.overlappingKeywords as string[]).map((kw, i) => (
                    <div key={`o-${i}`} className="text-[8px] text-[#FFB627] flex items-center gap-1 mb-0.5"><ArrowLeftRight size={8} />{kw}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Tab — ENHANCED
// ---------------------------------------------------------------------------

function DashboardTab({ seoLayers, avgScore, hermesPowered }: { seoLayers: SEOLayerData[]; avgScore: number; hermesPowered: boolean }) {
  const { seoSilos, seoScanResults, setActiveView } = useOSStore();
  const [_dashTab, setDashTab] = useState<'overview' | 'issues' | 'actions'>('overview');

  const allIssues = Object.values(seoScanResults).flatMap(r => r.issues);
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warningIssues = allIssues.filter(i => i.severity === 'warning');
  const totalPages = seoSilos.reduce((sum, s) => sum + s.clusters.reduce((cs, c) => cs + c.pages.length, 0), 0);
  const publishedPages = seoSilos.reduce((sum, s) => sum + s.clusters.reduce((cs, c) => cs + c.pages.filter(p => p.status === 'published').length, 0), 0);
  const optimizedPages = seoSilos.reduce((sum, s) => sum + s.clusters.reduce((cs, c) => cs + c.pages.filter(p => p.status === 'optimized').length, 0), 0);

  // Score trend data (from scan results)
  const scoreTrend = useMemo(() => {
    const scans = Object.values(seoScanResults);
    if (scans.length === 0) return [];
    return scans.map(s => s.score).slice(-10);
  }, [seoScanResults]);

  // Issues by category
  const issuesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    allIssues.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [allIssues]);

  const quickActions = [
    { label: 'New Scan', icon: Scan, color: '#FFB627', action: () => setActiveView('seo-silo' as string) },
    { label: 'New Silo', icon: Layers, color: '#1B998B', action: () => setActiveView('seo-silo' as string) },
    { label: 'Content Gen', icon: Sparkles, color: '#7B2CBF', action: () => setActiveView('seo-silo' as string) },
    { label: 'Check Links', icon: Shield, color: '#ff4444', action: () => setActiveView('seo-silo' as string) },
  ];

  return (
    <div className="space-y-4">
      {/* Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${cardCls} p-4 flex items-center gap-3`}>
          <ScoreRing score={avgScore} size={48} />
          <div>
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Overall SEO</div>
            <div className="text-sm font-mono font-bold" style={{ color: getScoreColor(avgScore) }}>{getScoreLabel(avgScore)}</div>
          </div>
        </div>
        <div className={`${cardCls} p-4 text-center`}>
          <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Content Coverage</div>
          <div className="font-mono font-bold text-lg text-[#1B998B]">{totalPages}</div>
          <div className="text-[7px] text-[#8888aa]">{publishedPages} published · {optimizedPages} optimized</div>
        </div>
        <div className={`${cardCls} p-4 text-center`}>
          <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Critical Issues</div>
          <div className="font-mono font-bold text-lg text-[#ff4444]">{criticalIssues.length}</div>
          <div className="text-[7px] text-[#8888aa]">{warningIssues.length} warnings</div>
        </div>
        <div className={`${cardCls} p-4 text-center`}>
          <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Engine</div>
          <div className="font-mono font-bold text-lg" style={{ color: hermesPowered ? '#00ff88' : '#ff4444' }}>
            {hermesPowered ? 'AI' : 'STATIC'}
          </div>
          <div className="text-[7px] text-[#8888aa]">{hermesPowered ? 'Hermes Active' : 'Offline Mode'}</div>
        </div>
      </div>

      {/* Score Trend & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Score Trend Sparkline */}
        <div className={`${cardCls} p-4 md:col-span-2`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-[#FFB627]" />
              <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Score Trend</span>
            </div>
            <span className="text-[9px] font-mono text-[#8888aa]">{scoreTrend.length} data points</span>
          </div>
          {scoreTrend.length >= 2 ? (
            <div className="flex items-center gap-3">
              <SparklineChart data={scoreTrend} color={getScoreColor(scoreTrend[scoreTrend.length - 1] || 0)} height={48} width={300} />
              <div className="text-right">
                <div className="text-lg font-mono font-bold" style={{ color: getScoreColor(scoreTrend[scoreTrend.length - 1] || 0) }}>
                  {scoreTrend[scoreTrend.length - 1] || 0}
                </div>
                <div className="text-[8px] text-[#8888aa]">latest score</div>
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-[#8888aa] text-center py-4">Scan more pages to see score trends</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={12} className="text-[#E8751A]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(qa => (
              <button key={qa.label} onClick={qa.action}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.3)] hover:bg-[rgba(157,78,221,0.08)] transition-all">
                <qa.icon size={16} style={{ color: qa.color }} />
                <span className="text-[8px] text-[#ccccdd]">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Scores */}
      <div className={`${cardCls} p-4`}>
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">7-Layer SEO Scores</span>
        </div>
        <div className="space-y-2">
          {seoLayers.map(layer => (
            <div key={layer.id} className="flex items-center gap-3">
              <div className="w-24 text-[9px] text-[#8888aa] truncate">L{layer.number}: {layer.name}</div>
              <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${layer.seoScore}%`, background: getScoreColor(layer.seoScore) }} />
              </div>
              <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: getScoreColor(layer.seoScore) }}>{layer.seoScore}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Issues Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top Issues */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle size={12} className="text-[#E8751A]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Top Issues ({allIssues.length})</span>
          </div>
          {criticalIssues.length > 0 && (
            <div className="mb-2">
              <span className="text-[8px] text-[#ff4444] uppercase font-bold block mb-1">Critical</span>
              {criticalIssues.slice(0, 3).map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[9px] py-1">
                  <SeverityBadge severity="critical" />
                  <span className="text-[#ccccdd] flex-1">{issue.description}</span>
                </div>
              ))}
            </div>
          )}
          {warningIssues.length > 0 && (
            <div>
              <span className="text-[8px] text-[#FFB627] uppercase font-bold block mb-1">Warnings</span>
              {warningIssues.slice(0, 4).map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[9px] py-1">
                  <SeverityBadge severity="warning" />
                  <span className="text-[#ccccdd] flex-1">{issue.description}</span>
                </div>
              ))}
            </div>
          )}
          {allIssues.length === 0 && (
            <div className="text-[9px] text-[#8888aa] text-center py-4">No issues found. Run a scan to check for problems.</div>
          )}
        </div>

        {/* Issues by Category */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <PieChart size={12} className="text-[#7B2CBF]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Issues by Category</span>
          </div>
          {issuesByCategory.length > 0 ? (
            <div className="space-y-2">
              {issuesByCategory.map(([cat, count]) => (
                <ProgressBar key={cat} label={cat} value={count} max={Math.max(...issuesByCategory.map(([, c]) => c))} color="#7B2CBF" />
              ))}
            </div>
          ) : (
            <div className="text-[9px] text-[#8888aa] text-center py-4">No issues categorized yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
