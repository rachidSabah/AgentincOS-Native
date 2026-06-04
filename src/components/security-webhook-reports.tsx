'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Link, BarChart3, Cpu, AlertTriangle, Scan, Search,
  ToggleLeft, ToggleRight, Play, Trash2, ExternalLink, Plus,
  Calendar, Clock, FileText, Zap, TrendingUp, ChevronRight,
  ArrowRight, CheckCircle2, XCircle, Eye, Send, Settings2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════════ */

const neonPurple = '#7B2CBF';
const neonGreen = '#00ff88';
const neonGold = '#FFB627';
const neonRed = '#E63946';

const cardCls =
  'rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4';
const sectionTitleCls =
  'text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5 mb-2';

/* ═══════════════════════════════════════════════════════════
   SECURITY SCANNER
   ═══════════════════════════════════════════════════════════ */

interface SecRule {
  id: string;
  name: string;
  type: 'injection' | 'pii' | 'access' | 'rate';
  action: 'block' | 'warn' | 'log';
  description: string;
  enabled: boolean;
}

interface SecThreat {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  source: string;
  action: 'blocked' | 'warned' | 'logged';
  details: string;
  timestamp: number;
}

interface SecStatus {
  riskScore: number;
  threatsFound: number;
  piiLeaksDetected: number;
  injectionAttempts: number;
  rulesActive: number;
}

interface ScanThreat {
  type: 'injection' | 'pii' | 'malicious';
  severity: 'critical' | 'high' | 'medium' | 'low';
  match: string;
  pattern: string;
  position: number;
}

interface AuditEntry {
  id: string;
  timestamp: number;
  type: string;
  severity: string;
  source: string;
  action: string;
  details: string;
}

export function SecurityScanner() {
  const { securityRiskScore, setSecurityRiskScore } = useOSStore();
  const [status, setStatus] = useState<SecStatus | null>(null);
  const [rules, setRules] = useState<SecRule[]>([]);
  const [threats, setThreats] = useState<SecThreat[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    safe: boolean;
    threats: ScanThreat[];
    riskScore: number;
    recommendations: string[];
    action: string;
  } | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadSecurityData = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/security');
      const data = await res.json();
      setStatus(data.status ?? null);
      setRules(data.rules ?? []);
      setThreats(data.recentThreats ?? []);
      if (data.status?.riskScore !== undefined) {
        setSecurityRiskScore(data.status.riskScore);
      }
    } catch { /* silent */ }
  }, [setSecurityRiskScore]);

  const loadAuditLog = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'audit-log' }),
      });
      const data = await res.json();
      setAuditLog((data.entries ?? []).slice(-30).reverse());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadSecurityData(), loadAuditLog()]);
    };
    load();
    const i = setInterval(() => { loadSecurityData(); }, 15000);
    return () => clearInterval(i);
  }, [loadSecurityData, loadAuditLog]);

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/hermes/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan-input', content: scanInput, source: 'manual-scan' }),
      });
      const data = await res.json();
      setScanResult(data);
      loadSecurityData();
      loadAuditLog();
    } catch { /* silent */ }
    setScanning(false);
  };

  const toggleRule = async (rule: SecRule) => {
    try {
      await fetch('/api/hermes/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-rules',
          rules: [{ ...rule, enabled: !rule.enabled }],
        }),
      });
      loadSecurityData();
    } catch { /* silent */ }
  };

  const score = status?.riskScore ?? securityRiskScore;
  const scoreColor = score < 30 ? neonGreen : score < 60 ? neonGold : neonRed;
  const scoreLabel = score < 30 ? 'LOW' : score < 60 ? 'MODERATE' : 'HIGH';
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const sevColor = (s: string) => {
    switch (s) {
      case 'critical': return neonRed;
      case 'high': return '#ff6b35';
      case 'medium': return neonGold;
      case 'low': return neonGreen;
      default: return '#8888aa';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Shield size={16} style={{ color: neonPurple }} /> Security Scanner
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono" style={{ color: scoreColor }}>
            RISK {scoreLabel}
          </span>
        </div>
      </div>

      {/* Risk Score Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cardCls} style={{ borderColor: `${scoreColor}25` }}
      >
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(136,136,170,0.1)" strokeWidth="6" />
              <motion.circle cx="50" cy="50" r="40" fill="none"
                stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor}60)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-xl text-white">{score}</span>
              <span className="text-[8px] text-[#8888aa]">/ 100</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: 'Threats', value: status?.threatsFound ?? 0, color: neonRed },
              { label: 'PII Leaks', value: status?.piiLeaksDetected ?? 0, color: neonGold },
              { label: 'Injections', value: status?.injectionAttempts ?? 0, color: '#ff6b35' },
              { label: 'Rules Active', value: status?.rulesActive ?? 0, color: neonGreen },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[8px] text-[#8888aa] uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Active Threats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={cardCls} style={{ borderColor: `${neonPurple}20` }}
      >
        <div className={sectionTitleCls}>
          <AlertTriangle size={10} style={{ color: neonRed }} /> Active Threats
        </div>
        {threats.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {threats.map((t, i) => (
              <motion.div key={t.id ?? i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 p-2 rounded-lg border"
                style={{ borderColor: `${sevColor(t.severity)}20`, background: `${sevColor(t.severity)}06` }}
              >
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                  style={{ color: sevColor(t.severity), border: `1px solid ${sevColor(t.severity)}40`, background: `${sevColor(t.severity)}10` }}>
                  {t.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[#ccccdd] truncate">{t.details}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono" style={{ color: sevColor(t.type === 'pii' ? neonGold : neonRed) }}>{t.type}</span>
                    <span className="text-[8px] text-[#8888aa]">→ {t.action}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-4">No active threats detected</div>
        )}
      </motion.div>

      {/* Scan Panel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cardCls} style={{ borderColor: `${neonGreen}20` }}
      >
        <div className={sectionTitleCls}>
          <Scan size={10} style={{ color: neonGreen }} /> Scan Panel
        </div>
        <textarea
          value={scanInput} onChange={e => setScanInput(e.target.value)}
          placeholder="Enter text to scan for injection attempts, PII, or malicious patterns..."
          className="w-full h-20 bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg p-2 text-[10px] text-[#ccccdd] placeholder-[#555577] resize-none focus:outline-none focus:border-[rgba(0,255,136,0.3)] font-mono"
        />
        <button onClick={handleScan} disabled={scanning || !scanInput.trim()}
          className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: `${neonGreen}35`, color: neonGreen, background: `${neonGreen}08` }}>
          <Search size={12} /> {scanning ? 'Scanning...' : 'Scan'}
        </button>

        <AnimatePresence>
          {scanResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                {scanResult.safe
                  ? <CheckCircle2 size={14} style={{ color: neonGreen }} />
                  : <XCircle size={14} style={{ color: neonRed }} />}
                <span className="text-[10px] font-medium" style={{ color: scanResult.safe ? neonGreen : neonRed }}>
                  {scanResult.safe ? 'SAFE — No threats detected' : `UNSAFE — ${scanResult.threats.length} threat(s) found`}
                </span>
                <span className="text-[9px] font-mono text-[#8888aa]">Action: {scanResult.action}</span>
              </div>
              {scanResult.threats.length > 0 && (
                <div className="space-y-1">
                  {scanResult.threats.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded border"
                      style={{ borderColor: `${sevColor(t.severity)}20`, background: `${sevColor(t.severity)}06` }}>
                      <span className="text-[8px] font-mono font-bold px-1 rounded"
                        style={{ color: sevColor(t.severity) }}>{t.severity.toUpperCase()}</span>
                      <span className="text-[9px] text-[#ccccdd]">"{t.match}"</span>
                      <span className="text-[8px] text-[#8888aa]">via {t.pattern}</span>
                    </div>
                  ))}
                </div>
              )}
              {scanResult.recommendations.length > 0 && (
                <div className="text-[9px] text-[#8888aa] space-y-0.5">
                  {scanResult.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <ChevronRight size={8} className="mt-0.5 flex-shrink-0" style={{ color: neonGold }} />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Security Rules */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className={cardCls} style={{ borderColor: `${neonPurple}20` }}
      >
        <div className={sectionTitleCls}>
          <Settings2 size={10} style={{ color: neonPurple }} /> Security Rules
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-2 rounded-lg border"
              style={{ borderColor: `${neonPurple}15`, background: rule.enabled ? `${neonPurple}06` : 'rgba(10,10,26,0.4)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ color: rule.type === 'injection' ? neonRed : rule.type === 'pii' ? neonGold : neonGreen,
                    border: `1px solid ${rule.type === 'injection' ? neonRed : rule.type === 'pii' ? neonGold : neonGreen}40` }}>
                  {rule.type}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] text-[#ccccdd] truncate">{rule.name}</div>
                  <div className="text-[8px] text-[#8888aa]">{rule.action} · {rule.description}</div>
                </div>
              </div>
              <button onClick={() => toggleRule(rule)} className="flex-shrink-0 ml-2">
                {rule.enabled
                  ? <ToggleRight size={18} style={{ color: neonGreen }} />
                  : <ToggleLeft size={18} style={{ color: '#555577' }} />}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Audit Log */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={cardCls} style={{ borderColor: `${neonPurple}15` }}
      >
        <div className={sectionTitleCls}>
          <Eye size={10} style={{ color: '#8888aa' }} /> Audit Log
        </div>
        {auditLog.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {auditLog.map((entry, i) => (
              <div key={entry.id ?? i} className="flex items-center gap-2 p-1.5 rounded text-[9px]">
                <span className="font-mono text-[8px] text-[#555577] flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-mono px-1 rounded"
                  style={{ color: sevColor(entry.severity), background: `${sevColor(entry.severity)}10` }}>
                  {entry.severity}
                </span>
                <span className="text-[#ccccdd] truncate flex-1">{entry.details}</span>
                <span className="text-[8px] text-[#555577] flex-shrink-0">{entry.action}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-3">No audit entries yet</div>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEBHOOK MANAGER
   ═══════════════════════════════════════════════════════════ */

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  deliveryCount: number;
  failureCount: number;
  lastDelivery?: { timestamp: number; status: number; duration: number };
  recentDeliveries: DeliveryData[];
  rateLimitRemaining: number;
}

interface DeliveryData {
  id: string;
  event: string;
  timestamp: number;
  status: number;
  duration: number;
  success: boolean;
}

const ALL_EVENTS = [
  'agent.message', 'task.complete', 'task.failed', 'cost.alert',
  'swarm.decision', 'workflow.complete', 'system.alert',
];

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>(ALL_EVENTS);
  const [selectedWh, setSelectedWh] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);

  // Register form
  const [regName, setRegName] = useState('');
  const [regUrl, setRegUrl] = useState('');
  const [regEvents, setRegEvents] = useState<string[]>([]);
  const [regSecret, setRegSecret] = useState('');
  const [regHeaders, setRegHeaders] = useState('');
  const [registering, setRegistering] = useState(false);

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
      setAvailableEvents(data.availableEvents ?? ALL_EVENTS);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => { await loadWebhooks(); };
    load();
    const i = setInterval(() => { loadWebhooks(); }, 15000);
    return () => clearInterval(i);
  }, [loadWebhooks]);

  const handleRegister = async () => {
    if (!regName || !regUrl || regEvents.length === 0 || !regSecret) return;
    setRegistering(true);
    try {
      let headers = {};
      if (regHeaders.trim()) {
        try { headers = JSON.parse(regHeaders); } catch { /* ignore */ }
      }
      await fetch('/api/hermes/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name: regName, url: regUrl, events: regEvents, secret: regSecret, headers }),
      });
      setRegName(''); setRegUrl(''); setRegEvents([]); setRegSecret(''); setRegHeaders('');
      loadWebhooks();
    } catch { /* silent */ }
    setRegistering(false);
  };

  const handleTest = async (id: string) => {
    try {
      await fetch('/api/hermes/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id }),
      });
      loadWebhooks();
      if (selectedWh === id) fetchDeliveries(id);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/hermes/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (selectedWh === id) { setSelectedWh(null); setDeliveries([]); }
      loadWebhooks();
    } catch { /* silent */ }
  };

  const handleToggle = async (wh: WebhookData) => {
    try {
      await fetch('/api/hermes/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: wh.id, active: !wh.active }),
      });
      loadWebhooks();
    } catch { /* silent */ }
  };

  const fetchDeliveries = async (id: string) => {
    try {
      const res = await fetch('/api/hermes/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deliveries', id }),
      });
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
    } catch { /* silent */ }
  };

  const toggleEvent = (ev: string) => {
    setRegEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Link size={16} style={{ color: neonGold }} /> Webhook Manager
        </h2>
        <span className="text-[9px] font-mono text-[#8888aa]">{webhooks.length} registered · {webhooks.filter(w => w.active).length} active</span>
      </div>

      {/* Register Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cardCls} style={{ borderColor: `${neonGold}20` }}
      >
        <div className={sectionTitleCls}>
          <Plus size={10} style={{ color: neonGold }} /> Register Webhook
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Name"
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] placeholder-[#555577] focus:outline-none focus:border-[rgba(255,182,39,0.3)]" />
          <input value={regUrl} onChange={e => setRegUrl(e.target.value)} placeholder="URL (https://...)"
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] placeholder-[#555577] focus:outline-none focus:border-[rgba(255,182,39,0.3)]" />
          <input value={regSecret} onChange={e => setRegSecret(e.target.value)} placeholder="Secret" type="password"
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] placeholder-[#555577] focus:outline-none focus:border-[rgba(255,182,39,0.3)]" />
          <input value={regHeaders} onChange={e => setRegHeaders(e.target.value)} placeholder='Headers (JSON: {"key":"val"})'
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] placeholder-[#555577] focus:outline-none focus:border-[rgba(255,182,39,0.3)]" />
        </div>

        {/* Events multi-select */}
        <div className="mt-2">
          <span className="text-[9px] text-[#8888aa] uppercase">Events</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {availableEvents.map(ev => (
              <button key={ev} onClick={() => toggleEvent(ev)}
                className="text-[8px] px-1.5 py-0.5 rounded-full border transition-all"
                style={{
                  borderColor: regEvents.includes(ev) ? `${neonGold}50` : 'rgba(157,78,221,0.15)',
                  color: regEvents.includes(ev) ? neonGold : '#8888aa',
                  background: regEvents.includes(ev) ? `${neonGold}10` : 'transparent',
                }}>
                {ev}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleRegister} disabled={registering || !regName || !regUrl || regEvents.length === 0 || !regSecret}
          className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: `${neonGold}35`, color: neonGold, background: `${neonGold}08` }}>
          <Send size={12} /> {registering ? 'Registering...' : 'Register'}
        </button>
      </motion.div>

      {/* Webhook List */}
      <div className="space-y-2">
        {webhooks.length > 0 ? webhooks.map((wh, i) => (
          <motion.div key={wh.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cardCls} style={{ borderColor: wh.active ? `${neonGreen}20` : 'rgba(136,136,170,0.15)' }}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${wh.active ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: wh.active ? neonGreen : '#8888aa' }} />
                  <span className="text-[11px] font-medium text-white truncate">{wh.name}</span>
                </div>
                <div className="text-[9px] text-[#8888aa] font-mono truncate mt-0.5">{wh.url}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] font-mono" style={{ color: neonGreen }}>{wh.deliveryCount} deliveries</span>
                  <span className="text-[9px] font-mono" style={{ color: wh.failureCount > 0 ? neonRed : '#8888aa' }}>{wh.failureCount} failures</span>
                  {wh.lastDelivery && (
                    <span className="text-[8px] text-[#555577]">
                      Last: HTTP {wh.lastDelivery.status} · {wh.lastDelivery.duration}ms
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map(ev => (
                    <span key={ev} className="text-[7px] px-1 py-0.5 rounded-full"
                      style={{ color: neonGold, background: `${neonGold}10`, border: `1px solid ${neonGold}25` }}>
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => handleTest(wh.id)} title="Test"
                  className="p-1 rounded border transition-all hover:border-[rgba(0,255,136,0.4)]"
                  style={{ borderColor: `${neonGreen}20`, color: neonGreen }}>
                  <Play size={10} />
                </button>
                <button onClick={() => { setSelectedWh(selectedWh === wh.id ? null : wh.id); if (selectedWh !== wh.id) fetchDeliveries(wh.id); }} title="Deliveries"
                  className="p-1 rounded border transition-all hover:border-[rgba(255,182,39,0.4)]"
                  style={{ borderColor: `${neonGold}20`, color: neonGold }}>
                  <ExternalLink size={10} />
                </button>
                <button onClick={() => handleToggle(wh)} title="Toggle"
                  className="p-1 rounded transition-all">
                  {wh.active ? <ToggleRight size={14} style={{ color: neonGreen }} /> : <ToggleLeft size={14} style={{ color: '#555577' }} />}
                </button>
                <button onClick={() => handleDelete(wh.id)} title="Delete"
                  className="p-1 rounded border transition-all hover:border-[rgba(230,57,70,0.4)]"
                  style={{ borderColor: `${neonRed}20`, color: neonRed }}>
                  <Trash2 size={10} />
                </button>
              </div>
            </div>

            {/* Delivery History (expanded) */}
            <AnimatePresence>
              {selectedWh === wh.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] overflow-hidden"
                >
                  <div className={sectionTitleCls}>
                    <Zap size={10} style={{ color: neonGold }} /> Delivery History
                  </div>
                  {deliveries.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {deliveries.map(d => (
                        <div key={d.id} className="flex items-center gap-2 p-1.5 rounded text-[9px]"
                          style={{ background: d.success ? `${neonGreen}06` : `${neonRed}06` }}>
                          {d.success
                            ? <CheckCircle2 size={10} style={{ color: neonGreen }} />
                            : <XCircle size={10} style={{ color: neonRed }} />}
                          <span className="font-mono" style={{ color: d.success ? neonGreen : neonRed }}>
                            HTTP {d.status}
                          </span>
                          <span className="text-[#8888aa]">{d.event}</span>
                          <span className="text-[#555577]">{d.duration}ms</span>
                          <span className="text-[#555577] ml-auto">{new Date(d.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9px] text-[#8888aa] text-center py-2">No deliveries yet</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )) : (
          <div className={cardCls} style={{ borderColor: 'rgba(157,78,221,0.1)' }}>
            <div className="text-[10px] text-[#8888aa] text-center py-4">No webhooks registered</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORT GENERATOR
   ═══════════════════════════════════════════════════════════ */

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
}

interface ScheduledReport {
  id: string;
  type: string;
  schedule: string;
  delivery: string;
  active: boolean;
  nextRun: number;
}

interface RecentReport {
  id: string;
  type: string;
  generatedAt: number;
  tasksCompleted: number;
  totalCost: number;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'daily-digest': <Clock size={14} style={{ color: neonGreen }} />,
  'weekly-analytics': <BarChart3 size={14} style={{ color: neonGold }} />,
  'monthly-roi': <TrendingUp size={14} style={{ color: neonPurple }} />,
  'custom': <Settings2 size={14} style={{ color: neonRed }} />,
};

export function ReportGenerator() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);
  const [recent, setRecent] = useState<RecentReport[]>([]);
  const [genType, setGenType] = useState('daily-digest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [schedType, setSchedType] = useState('daily-digest');
  const [schedSchedule, setSchedSchedule] = useState('every-day');
  const [schedDelivery, setSchedDelivery] = useState('dashboard');

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/reports');
      const data = await res.json();
      setTemplates(data.templates ?? []);
      setRecent(data.recentReports ?? []);
    } catch { /* silent */ }
  }, []);

  const loadScheduled = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-scheduled' }),
      });
      const data = await res.json();
      setScheduled(data.scheduled ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => { await Promise.all([loadReports(), loadScheduled()]); };
    load();
  }, [loadReports, loadScheduled]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
      await fetch('/api/hermes/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', type: genType, dateRange }),
      });
      loadReports();
    } catch { /* silent */ }
    setGenerating(false);
  };

  const handleSchedule = async () => {
    try {
      await fetch('/api/hermes/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule', type: schedType, schedule: schedSchedule, delivery: schedDelivery }),
      });
      loadScheduled();
    } catch { /* silent */ }
  };

  const handleCancel = async (id: string) => {
    try {
      await fetch('/api/hermes/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      });
      loadScheduled();
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <BarChart3 size={16} style={{ color: neonGold }} /> Report Generator
        </h2>
        <span className="text-[9px] font-mono text-[#8888aa]">{recent.length} reports · {scheduled.filter(s => s.active).length} scheduled</span>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-2 gap-2">
        {templates.map((tpl, i) => (
          <motion.div key={tpl.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3 cursor-pointer transition-all"
            style={{
              borderColor: genType === tpl.id ? `${neonGold}50` : 'rgba(157,78,221,0.12)',
              background: genType === tpl.id ? `${neonGold}08` : 'rgba(18,18,42,0.5)',
            }}
            onClick={() => setGenType(tpl.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              {TEMPLATE_ICONS[tpl.id] ?? <FileText size={14} style={{ color: '#8888aa' }} />}
              <span className="text-[10px] font-medium text-white">{tpl.name}</span>
            </div>
            <div className="text-[9px] text-[#8888aa]">{tpl.description}</div>
          </motion.div>
        ))}
        {templates.length === 0 && (
          <>
            {[
              { id: 'daily-digest', name: 'Daily Digest', desc: 'Summary of daily activity & costs' },
              { id: 'weekly-analytics', name: 'Weekly Analytics', desc: 'Trends & comparisons' },
              { id: 'monthly-roi', name: 'Monthly ROI', desc: 'Cost optimization & ROI analysis' },
              { id: 'custom', name: 'Custom', desc: 'User-selected metrics & date range' },
            ].map((tpl, i) => (
              <motion.div key={tpl.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border p-3 cursor-pointer transition-all"
                style={{
                  borderColor: genType === tpl.id ? `${neonGold}50` : 'rgba(157,78,221,0.12)',
                  background: genType === tpl.id ? `${neonGold}08` : 'rgba(18,18,42,0.5)',
                }}
                onClick={() => setGenType(tpl.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {TEMPLATE_ICONS[tpl.id] ?? <FileText size={14} style={{ color: '#8888aa' }} />}
                  <span className="text-[10px] font-medium text-white">{tpl.name}</span>
                </div>
                <div className="text-[9px] text-[#8888aa]">{tpl.desc}</div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Generate Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cardCls} style={{ borderColor: `${neonGold}20` }}
      >
        <div className={sectionTitleCls}>
          <Zap size={10} style={{ color: neonGold }} /> Generate Report
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={genType} onChange={e => setGenType(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] focus:outline-none">
            <option value="daily-digest">Daily Digest</option>
            <option value="weekly-analytics">Weekly Analytics</option>
            <option value="monthly-roi">Monthly ROI</option>
            <option value="custom">Custom</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] focus:outline-none" />
          <span className="text-[9px] text-[#8888aa]">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] focus:outline-none" />
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
            style={{ borderColor: `${neonGold}35`, color: neonGold, background: `${neonGold}08` }}>
            <ArrowRight size={12} /> {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </motion.div>

      {/* Scheduled Reports */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className={cardCls} style={{ borderColor: `${neonPurple}20` }}
      >
        <div className={sectionTitleCls}>
          <Calendar size={10} style={{ color: neonPurple }} /> Scheduled Reports
        </div>

        {/* Schedule form */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <select value={schedType} onChange={e => setSchedType(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1 text-[9px] text-[#ccccdd] focus:outline-none">
            <option value="daily-digest">Daily</option>
            <option value="weekly-analytics">Weekly</option>
            <option value="monthly-roi">Monthly</option>
          </select>
          <select value={schedSchedule} onChange={e => setSchedSchedule(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1 text-[9px] text-[#ccccdd] focus:outline-none">
            <option value="every-day">Every day</option>
            <option value="every-weekday">Every weekday</option>
            <option value="every-week">Every week</option>
            <option value="every-month">Every month</option>
          </select>
          <select value={schedDelivery} onChange={e => setSchedDelivery(e.target.value)}
            className="bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1 text-[9px] text-[#ccccdd] focus:outline-none">
            <option value="dashboard">Dashboard</option>
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="obsidian">Obsidian</option>
          </select>
          <button onClick={handleSchedule}
            className="flex items-center gap-1 px-3 py-1 rounded-lg border text-[9px] font-medium transition-all"
            style={{ borderColor: `${neonPurple}35`, color: neonPurple, background: `${neonPurple}08` }}>
            <Plus size={10} /> Schedule
          </button>
        </div>

        {scheduled.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {scheduled.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border"
                style={{ borderColor: s.active ? `${neonPurple}15` : 'rgba(136,136,170,0.1)', background: s.active ? `${neonPurple}06` : 'rgba(10,10,26,0.4)' }}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: s.active ? neonGreen : '#8888aa' }} />
                  <div>
                    <span className="text-[10px] text-[#ccccdd]">{s.type}</span>
                    <span className="text-[8px] text-[#8888aa] ml-2">{s.schedule} → {s.delivery}</span>
                  </div>
                </div>
                {s.active ? (
                  <button onClick={() => handleCancel(s.id)}
                    className="text-[8px] px-2 py-0.5 rounded border transition-all"
                    style={{ borderColor: `${neonRed}30`, color: neonRed, background: `${neonRed}08` }}>
                    Cancel
                  </button>
                ) : (
                  <span className="text-[8px] text-[#555577]">CANCELLED</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[9px] text-[#8888aa] text-center py-2">No scheduled reports</div>
        )}
      </motion.div>

      {/* Recent Reports */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={cardCls} style={{ borderColor: `${neonGold}15` }}
      >
        <div className={sectionTitleCls}>
          <FileText size={10} style={{ color: neonGold }} /> Recent Reports
        </div>
        {recent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recent.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="p-2 rounded-lg border"
                style={{ borderColor: 'rgba(157,78,221,0.12)', background: 'rgba(18,18,42,0.4)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ color: neonGold, background: `${neonGold}10`, border: `1px solid ${neonGold}25` }}>
                    {r.type}
                  </span>
                  <span className="text-[8px] text-[#555577] font-mono">{r.generatedAt ? new Date(r.generatedAt).toLocaleString('en-US') : '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-mono font-bold text-xs text-[#ccccdd]">{r.tasksCompleted}</div>
                    <div className="text-[7px] text-[#8888aa]">tasks</div>
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xs" style={{ color: neonGold }}>${r.totalCost.toFixed(2)}</div>
                    <div className="text-[7px] text-[#8888aa]">cost</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-4">No reports generated yet</div>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODEL ROUTER
   ═══════════════════════════════════════════════════════════ */

interface ModelData {
  id: string;
  name: string;
  provider: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  contextWindow: number;
  strengths: string[];
  performance: { avgLatency: number; successRate: number; avgQuality: number; totalCalls: number };
}

interface RoutingRuleData {
  taskType: string;
  modelId: string;
  priority: number;
}

interface RoutingDecision {
  modelId: string;
  modelName: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  alternatives: { modelId: string; modelName: string; reason: string }[];
}

interface OptSuggestion {
  type: 'cost' | 'speed' | 'quality';
  current: string;
  suggested: string;
  reason: string;
  estimatedSavings: number;
}

const providerColor: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a27f',
  'nous-research': neonGold,
  mistral: '#ff7000',
  meta: '#0084ff',
};

export function ModelRouter() {
  const { setAvailableModels } = useOSStore();
  const [models, setModels] = useState<ModelData[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRuleData[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [routerTask, setRouterTask] = useState('');
  const [routerPriority, setRouterPriority] = useState(50);
  const [routing, setRouting] = useState(false);
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [performance, setPerformance] = useState<{
    models: { modelId: string; modelName: string; provider: string; avgLatency: number; successRate: number; avgQuality: number; totalCalls: number }[];
  } | null>(null);
  const [suggestions, setSuggestions] = useState<OptSuggestion[]>([]);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/model-router');
      const data = await res.json();
      setModels(data.models ?? []);
      setRoutingRules(data.routingRules ?? []);
      setTaskTypes(data.taskTypes ?? []);
      setAvailableModels(
        (data.models ?? []).map((m: ModelData) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          costPer1kInput: m.costPer1kInput,
          costPer1kOutput: m.costPer1kOutput,
          contextWindow: m.contextWindow,
          strengths: m.strengths,
        })),
      );
    } catch { /* silent */ }
  }, [setAvailableModels]);

  const loadPerf = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/model-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-performance' }),
      });
      const data = await res.json();
      setPerformance(data);
    } catch { /* silent */ }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/model-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-optimizations' }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => { await Promise.all([loadModels(), loadPerf(), loadSuggestions()]); };
    load();
    const i = setInterval(() => { loadModels(); }, 20000);
    return () => clearInterval(i);
  }, [loadModels, loadPerf, loadSuggestions]);

  const handleRoute = async () => {
    if (!routerTask.trim()) return;
    setRouting(true);
    setDecision(null);
    const priority = routerPriority < 33 ? 'cost' : routerPriority > 66 ? 'quality' : 'speed';
    try {
      const res = await fetch('/api/hermes/model-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'route', task: routerTask, priority, agentId: 'ui-router' }),
      });
      const data = await res.json();
      setDecision(data.routing ?? null);
      loadPerf();
    } catch { /* silent */ }
    setRouting(false);
  };

  const formatCtx = (w: number) => w >= 1000 ? `${(w / 1000).toFixed(0)}K` : String(w);

  const priorityLabel = routerPriority < 33 ? 'COST' : routerPriority > 66 ? 'QUALITY' : 'SPEED';
  const priorityColor = routerPriority < 33 ? neonGreen : routerPriority > 66 ? neonGold : '#00bfff';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Cpu size={16} style={{ color: neonPurple }} /> Model Router
        </h2>
        <span className="text-[9px] font-mono text-[#8888aa]">{models.length} models · {routingRules.length} rules</span>
      </div>

      {/* Available Models Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {models.map((m, i) => {
          const pColor = providerColor[m.provider] ?? '#8888aa';
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-xl border p-3"
              style={{ borderColor: `${pColor}20`, background: `${pColor}06` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-white truncate">{m.name}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ color: pColor, border: `1px solid ${pColor}40`, background: `${pColor}10` }}>
                  {m.provider}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <div>
                  <div className="font-mono font-bold text-[10px]" style={{ color: neonGreen }}>
                    ${m.costPer1kInput.toFixed(4)}
                  </div>
                  <div className="text-[7px] text-[#8888aa]">in/1K</div>
                </div>
                <div>
                  <div className="font-mono font-bold text-[10px]" style={{ color: neonGold }}>
                    ${m.costPer1kOutput.toFixed(4)}
                  </div>
                  <div className="text-[7px] text-[#8888aa]">out/1K</div>
                </div>
                <div>
                  <div className="font-mono font-bold text-[10px] text-[#ccccdd]">
                    {formatCtx(m.contextWindow)}
                  </div>
                  <div className="text-[7px] text-[#8888aa]">context</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.strengths.map(s => (
                  <span key={s} className="text-[7px] px-1 py-0.5 rounded-full"
                    style={{ color: neonPurple, background: `${neonPurple}10`, border: `1px solid ${neonPurple}25` }}>
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Routing Rules */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cardCls} style={{ borderColor: `${neonPurple}20` }}
      >
        <div className={sectionTitleCls}>
          <Settings2 size={10} style={{ color: neonPurple }} /> Routing Rules
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {routingRules.map(rule => {
            const model = models.find(m => m.id === rule.modelId);
            return (
              <div key={rule.taskType} className="p-2 rounded-lg border text-center"
                style={{ borderColor: 'rgba(157,78,221,0.12)', background: 'rgba(18,18,42,0.4)' }}>
                <div className="text-[9px] text-[#8888aa] uppercase">{rule.taskType}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <ChevronRight size={8} style={{ color: neonPurple }} />
                  <span className="text-[10px] font-medium text-[#ccccdd]">{model?.name ?? rule.modelId}</span>
                </div>
                <div className="text-[8px] text-[#555577] font-mono">P{rule.priority}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Smart Router */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className={cardCls} style={{ borderColor: `${neonGreen}20` }}
      >
        <div className={sectionTitleCls}>
          <Zap size={10} style={{ color: neonGreen }} /> Smart Router
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={routerTask} onChange={e => setRouterTask(e.target.value)}
            placeholder="Describe task (e.g. 'research quantum computing')"
            className="flex-1 min-w-48 bg-[rgba(10,10,26,0.8)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] placeholder-[#555577] focus:outline-none focus:border-[rgba(0,255,136,0.3)]"
          />
          <button onClick={handleRoute} disabled={routing || !routerTask.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
            style={{ borderColor: `${neonGreen}35`, color: neonGreen, background: `${neonGreen}08` }}>
            <Cpu size={12} /> {routing ? 'Routing...' : 'Get Recommendation'}
          </button>
        </div>

        {/* Priority slider */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[9px] font-mono" style={{ color: neonGreen }}>COST</span>
          <input type="range" min={0} max={100} value={routerPriority}
            onChange={e => setRouterPriority(Number(e.target.value))}
            className="flex-1 h-1 accent-[#7B2CBF] cursor-pointer"
          />
          <span className="text-[9px] font-mono" style={{ color: neonGold }}>QUALITY</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: priorityColor, background: `${priorityColor}10` }}>
            {priorityLabel}
          </span>
        </div>

        <AnimatePresence>
          {decision && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 p-3 rounded-lg border"
              style={{ borderColor: `${neonGreen}25`, background: `${neonGreen}06` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} style={{ color: neonGreen }} />
                <span className="text-[11px] font-medium text-white">{decision.modelName}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ color: providerColor[decision.provider] ?? '#8888aa',
                    border: `1px solid ${providerColor[decision.provider] ?? '#8888aa'}40` }}>
                  {decision.provider}
                </span>
              </div>
              <div className="text-[9px] text-[#ccccdd] mb-2">{decision.reason}</div>
              <div className="flex items-center gap-4 mb-2">
                <div>
                  <div className="font-mono font-bold text-xs" style={{ color: neonGreen }}>${decision.estimatedCost.toFixed(4)}</div>
                  <div className="text-[7px] text-[#8888aa]">est. cost</div>
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-[#ccccdd]">{decision.estimatedLatency}ms</div>
                  <div className="text-[7px] text-[#8888aa]">est. latency</div>
                </div>
              </div>
              {decision.alternatives.length > 0 && (
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase mb-1">Alternatives</div>
                  {decision.alternatives.map((alt, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px] text-[#8888aa]">
                      <ArrowRight size={8} style={{ color: neonPurple }} />
                      <span className="text-[#ccccdd]">{alt.modelName}</span>
                      <span className="text-[8px]">{alt.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Performance Comparison */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={cardCls} style={{ borderColor: `${neonGold}15` }}
      >
        <div className={sectionTitleCls}>
          <TrendingUp size={10} style={{ color: neonGold }} /> Performance Comparison
        </div>
        {performance && performance.models.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-[#8888aa] uppercase">
                  <th className="text-left pb-1.5 pr-2">Model</th>
                  <th className="text-right pb-1.5 px-2">Latency</th>
                  <th className="text-right pb-1.5 px-2">Success</th>
                  <th className="text-right pb-1.5 px-2">Quality</th>
                  <th className="text-right pb-1.5 pl-2">Calls</th>
                </tr>
              </thead>
              <tbody>
                {performance.models.map(m => (
                  <tr key={m.modelId} className="border-t border-[rgba(157,78,221,0.08)]">
                    <td className="py-1.5 pr-2">
                      <span className="text-[#ccccdd]">{m.modelName}</span>
                      <span className="text-[8px] ml-1" style={{ color: providerColor[m.provider] ?? '#8888aa' }}>{m.provider}</span>
                    </td>
                    <td className="text-right font-mono px-2" style={{ color: m.avgLatency > 500 ? neonRed : m.avgLatency > 200 ? neonGold : neonGreen }}>
                      {m.avgLatency || '—'}ms
                    </td>
                    <td className="text-right font-mono px-2" style={{ color: m.successRate >= 0.9 ? neonGreen : m.successRate >= 0.7 ? neonGold : neonRed }}>
                      {m.totalCalls > 0 ? `${(m.successRate * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="text-right font-mono px-2" style={{ color: m.avgQuality >= 0.8 ? neonGreen : m.avgQuality >= 0.6 ? neonGold : neonRed }}>
                      {m.totalCalls > 0 ? `${(m.avgQuality * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="text-right font-mono text-[#8888aa] pl-2">{m.totalCalls || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-3">No performance data yet — route tasks to collect data</div>
        )}
      </motion.div>

      {/* Optimization Suggestions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className={cardCls} style={{ borderColor: `${neonPurple}15` }}
      >
        <div className={sectionTitleCls}>
          <Zap size={10} style={{ color: neonGold }} /> Optimization Suggestions
        </div>
        {suggestions.length > 0 ? (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg border"
                style={{
                  borderColor: `${s.type === 'cost' ? neonGreen : s.type === 'speed' ? '#00bfff' : neonGold}20`,
                  background: `${s.type === 'cost' ? neonGreen : s.type === 'speed' ? '#00bfff' : neonGold}06`,
                }}
              >
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                  style={{
                    color: s.type === 'cost' ? neonGreen : s.type === 'speed' ? '#00bfff' : neonGold,
                    border: `1px solid ${s.type === 'cost' ? neonGreen : s.type === 'speed' ? '#00bfff' : neonGold}40`,
                  }}>
                  {s.type.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] text-[#ccccdd]">
                    {s.current} → {s.suggested}
                  </div>
                  <div className="text-[9px] text-[#8888aa]">{s.reason}</div>
                  {s.estimatedSavings > 0 && (
                    <div className="text-[8px] font-mono mt-0.5" style={{ color: neonGreen }}>
                      Est. savings: ${s.estimatedSavings.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-3">No optimization suggestions yet</div>
        )}
      </motion.div>
    </div>
  );
}
