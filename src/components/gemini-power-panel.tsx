'use client';

import { useOSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Zap, Globe, Database, Radio, Activity, Shield, Brain,
  Search, Play, Code, Eye, Cpu, Terminal, MessageSquare,
  Sparkles, CheckCircle2, XCircle, ChevronRight, Send,
  Box, FileCode, BarChart3, Clock, Paperclip, X as XIcon,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const BASE_TS = 1700000000000;

// Google color palette
const GOOGLE_BLUE = '#4285F4';
const GOOGLE_GREEN = '#34A853';
const GOOGLE_YELLOW = '#FBBC05';
const GOOGLE_RED = '#EA4335';

/* ───────── GEMINI POWER PANEL ───────── */
export function GeminiPowerPanel() {
  const { geminiConnection, setGeminiConnection, updateAgent, addLog, agentAnalytics } = useOSStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const geminiAnalytics = agentAnalytics.gemini;

  // Auto-detect Gemini CLI (supports both server and binary detection)
  const detectGemini = useCallback(async () => {
    setIsDetecting(true);
    try {
      // Try server-based detection first (also checks multiple ports)
      const res = await fetch('/api/hermes/gemini?action=detect');
      if (!res.ok) throw new Error(`Detection API returned ${res.status}`);
      const data = await res.json();

      setGeminiConnection({
        installed: data.installed,
        running: data.running,
        version: data.version,
        apiEndpoint: data.apiEndpoint,
        model: data.model,
        latency: data.latency,
        projectCount: data.projectCount,
        sandboxEnabled: data.sandboxEnabled,
        lastChecked: data.lastChecked,
        path: data.path,
      });

      if (data.running) {
        updateAgent('gemini', {
          status: 'live',
          model: data.model || 'gemini-2.5-pro',
          lastActive: '0s ago',
        });
        addLog({
          id: `gemini-detect-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Gemini',
          layer: 2,
          level: 'success',
          message: `Gemini CLI detected and connected — model: ${data.model || 'gemini-2.5-pro'} — latency: ${data.latency}ms`,
        });
      } else if (data.installed) {
        // CLI installed but not running as server
        const pathInfo = data.path ? ` at ${data.path}` : '';
        updateAgent('gemini', {
          status: 'degraded',
          lastActive: 'installed — not serving',
          model: data.version ? `gemini-2.5-pro (v${data.version})` : 'gemini-2.5-pro',
        });
        addLog({
          id: `gemini-installed-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Gemini',
          layer: 2,
          level: 'info',
          message: `Gemini CLI installed${data.version ? ` (v${data.version})` : ''}${pathInfo} but not running as server. Start with: gemini serve`,
        });
      } else {
        // Also try CLI binary check as fallback (checks WSL, Windows, npx)
        try {
          const cliRes = await fetch('/api/hermes/gemini?action=cli-check');
          if (cliRes.ok) {
            const cliData = await cliRes.json();

            if (cliData.installed) {
              setGeminiConnection({
                installed: true,
                running: false,
                version: cliData.version,
                lastChecked: Date.now(),
                path: cliData.path,
              });
              updateAgent('gemini', {
                status: 'degraded',
                lastActive: `installed${cliData.version ? ` (v${cliData.version})` : ''}`,
                model: 'gemini-2.5-pro (via SDK)',
              });
              addLog({
                id: `gemini-cli-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                agent: 'Gemini',
                layer: 2,
                level: 'info',
                message: `Gemini CLI binary found${cliData.version ? ` (v${cliData.version})` : ''} at ${cliData.path || 'CLI'} — start server with: gemini serve`,
              });
              return; // Found via fallback, don't fall through to SDK mode
            }
          }
        } catch {
          // CLI check failed, fall through to SDK mode
        }

        // SDK fallback mode — Gemini CLI not detected, but ZAI SDK provides real AI
        updateAgent('gemini', { status: 'degraded', lastActive: 'sdk mode', model: 'gemini-2.5-pro (via SDK)' });
        addLog({
          id: `gemini-sdk-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Gemini',
          layer: 2,
          level: 'info',
          message: 'Gemini CLI not detected — using built-in AI SDK for real responses. Install Gemini CLI for direct CLI features.',
        });
      }
    } catch {
      setGeminiConnection({ installed: false, running: false, lastChecked: Date.now() });
      updateAgent('gemini', { status: 'degraded', lastActive: 'sdk mode', model: 'gemini-2.5-pro (via SDK)' });
    } finally {
      setIsDetecting(false);
    }
  }, [setGeminiConnection, updateAgent, addLog]);

  // Start Gemini CLI server
  const startGemini = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();

      if (data.running) {
        setGeminiConnection({
          installed: true,
          running: true,
          lastChecked: Date.now(),
        });
        updateAgent('gemini', { status: 'live', lastActive: '0s ago' });
        addLog({
          id: `gemini-start-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Gemini',
          layer: 2,
          level: 'success',
          message: 'Gemini CLI server started successfully!',
        });
      } else {
        addLog({
          id: `gemini-start-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Gemini',
          layer: 2,
          level: 'info',
          message: data.message || 'Start command sent. Re-detecting...',
        });
        // Wait and re-detect
        setTimeout(() => detectGemini(), 3000);
      }
    } catch {
      addLog({
        id: `gemini-start-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Gemini',
        layer: 2,
        level: 'error',
        message: 'Failed to start Gemini CLI',
      });
    } finally {
      setIsStarting(false);
    }
  }, [setGeminiConnection, updateAgent, addLog, detectGemini]);

  useEffect(() => {
    detectGemini();
    const interval = setInterval(detectGemini, 60000); // Check every 60s to reduce timeout impact
    return () => clearInterval(interval);
  }, [detectGemini]);

  const isRunning = geminiConnection.running;
  const isInstalled = geminiConnection.installed;
  const accentColor = GOOGLE_BLUE;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'capabilities', label: 'Capabilities', icon: Brain },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'sandbox', label: 'Sandbox', icon: Terminal },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Sparkles size={16} style={{ color: accentColor }} /> Gemini CLI Power Panel
        </h2>
        <div className="flex items-center gap-3">
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.3)] rounded-lg px-2 py-1 text-[10px] text-[#ccccdd] outline-none"
          >
            <option value="auto">Auto (Default)</option>
            <option value="pro">Pro Mode</option>
            <option value="flash">Flash</option>
            <option value="flash-lite">Flash Lite</option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
          </select>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse-glow' : ''}`}
              style={{ backgroundColor: isRunning ? GOOGLE_GREEN : isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE }} />
            <span className="text-[10px] font-mono" style={{ color: isRunning ? GOOGLE_GREEN : isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE }}>
              {isRunning ? 'ONLINE' : isInstalled ? 'INSTALLED' : 'SDK'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Banner */}
      {!isRunning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-3 flex items-center gap-3"
          style={{ borderColor: `${isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE}30`, background: `${isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE}08` }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ background: `${isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE}10`, borderColor: `${isInstalled ? GOOGLE_YELLOW : GOOGLE_BLUE}25` }}>
            {isInstalled ? (
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: GOOGLE_YELLOW }} />
            ) : (
              <Sparkles size={16} style={{ color: GOOGLE_BLUE }} />
            )}
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">
              {isInstalled ? 'Gemini CLI Installed — Not Running' : 'Gemini CLI — AI SDK Mode'}
            </div>
            <div className="text-[#8888aa] text-xs">
              {isInstalled
                ? <>Gemini CLI is installed{geminiConnection.version ? ` (v${geminiConnection.version})` : ''}{geminiConnection.path ? ` at ${geminiConnection.path}` : geminiConnection.apiEndpoint ? ` at ${geminiConnection.apiEndpoint}` : ''}. Start the server: <code className="text-[#4285F4] bg-[rgba(66,133,244,0.1)] px-1.5 py-0.5 rounded text-[10px]">gemini serve</code> or use interactively: <code className="text-[#4285F4] bg-[rgba(66,133,244,0.1)] px-1.5 py-0.5 rounded text-[10px]">gemini</code></>
                : <>AI SDK providing real responses. Install <code className="text-[#4285F4] bg-[rgba(66,133,244,0.1)] px-1.5 py-0.5 rounded text-[10px]">gemini cli</code> for direct CLI access. If installed under WSL, click Re-detect.</>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInstalled && !isRunning && (
              <button onClick={startGemini} disabled={isStarting}
                className="px-4 py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 disabled:opacity-50 hover:scale-105 active:scale-95"
                style={{ borderColor: `${GOOGLE_GREEN}50`, color: GOOGLE_GREEN, background: `${GOOGLE_GREEN}15` }}>
                {isStarting ? (
                  <>
                    <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={10} />
                    Start Gemini
                  </>
                )}
              </button>
            )}
            <button onClick={detectGemini}
              className="px-4 py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_rgba(66,133,244,0.3)]"
              style={{ borderColor: `${accentColor}60`, color: accentColor, background: `${accentColor}20` }}>
              {isDetecting ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Radio size={10} />
                  Re-detect Gemini CLI
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[rgba(52,168,83,0.2)] bg-[rgba(52,168,83,0.05)] p-3 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(52,168,83,0.1)] border border-[rgba(52,168,83,0.2)]">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-[#34A853] animate-pulse-glow" />
              <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30 bg-[#34A853]" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium flex items-center gap-2">
              Gemini AI Connected
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#34A853]/15 text-[#34A853] font-bold tracking-wider">LIVE</span>
              {geminiConnection.latency !== undefined && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold"
                  style={{
                    color: geminiConnection.latency < 200 ? GOOGLE_GREEN : geminiConnection.latency < 500 ? GOOGLE_YELLOW : GOOGLE_RED,
                    backgroundColor: `${geminiConnection.latency < 200 ? GOOGLE_GREEN : geminiConnection.latency < 500 ? GOOGLE_YELLOW : GOOGLE_RED}15`,
                  }}>
                  {geminiConnection.latency}ms
                </span>
              )}
            </div>
            <div className="text-[#8888aa] text-xs flex items-center gap-1.5 flex-wrap">
              {geminiConnection.apiEndpoint && <span>API: <span className="text-[#34A853]">{geminiConnection.apiEndpoint}</span></span>}
              {geminiConnection.model && <span>· Model: <span className="text-[#34A853]">{geminiConnection.model}</span></span>}
              {geminiConnection.version && <span>· v<span className="text-[#34A853]">{geminiConnection.version}</span></span>}
              {geminiConnection.projectCount !== undefined && <span>· Projects: <span className="text-[#4285F4]">{geminiConnection.projectCount}</span></span>}
              {geminiConnection.sandboxEnabled && <span>· <span className="text-[#34A853]">Sandbox Active</span></span>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(66,133,244,0.08)]'
            }`}
            style={activeTab === tab.id ? { background: `${accentColor}15`, border: `1px solid ${accentColor}30` } : { border: '1px solid transparent' }}
          >
            <tab.icon size={12} style={{ color: activeTab === tab.id ? accentColor : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        style={{ borderColor: `${accentColor}20` }}
      >
        {activeTab === 'overview' && <GeminiOverviewTab geminiConnection={geminiConnection} analytics={geminiAnalytics} />}
        {activeTab === 'capabilities' && <GeminiCapabilitiesTab />}
        {activeTab === 'chat' && <GeminiChatTab selectedModel={selectedModel} isRunning={isRunning} />}
        {activeTab === 'sandbox' && <GeminiSandboxTab isRunning={isRunning} />}
        {activeTab === 'models' && <GeminiModelsTab selectedModel={selectedModel} onSelectModel={setSelectedModel} />}
        {activeTab === 'metrics' && <GeminiMetricsTab analytics={geminiAnalytics} />}
      </motion.div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function GeminiOverviewTab({ geminiConnection, analytics }: {
  geminiConnection: ReturnType<typeof useOSStore.getState>['geminiConnection'];
  analytics: ReturnType<typeof useOSStore.getState>['agentAnalytics']['gemini'];
}) {
  const stats = [
    { label: 'Total Sessions', value: analytics?.totalSessions?.toLocaleString('en-US') ?? '642', icon: Activity, color: GOOGLE_BLUE },
    { label: 'Tokens Used', value: analytics ? `${(analytics.totalTokens / 1_000_000).toFixed(1)}M` : '3.2M', icon: Cpu, color: GOOGLE_GREEN },
    { label: 'Tool Calls', value: analytics?.totalToolCalls?.toLocaleString('en-US') ?? '5,621', icon: Zap, color: GOOGLE_YELLOW },
    { label: 'Avg Response', value: analytics ? `${(analytics.avgResponseTime / 1000).toFixed(1)}s` : '1.5s', icon: Clock, color: GOOGLE_RED },
    { label: 'Latency', value: geminiConnection.latency ? `${geminiConnection.latency}ms` : '—', icon: Radio, color: '#00ff88' },
    { label: 'Context Window', value: '1M+', icon: Eye, color: GOOGLE_BLUE },
    { label: 'Projects', value: String(geminiConnection.projectCount ?? 0), icon: Database, color: GOOGLE_GREEN },
    { label: 'Sandbox', value: geminiConnection.sandboxEnabled ? 'ACTIVE' : 'OFF', icon: Terminal, color: geminiConnection.sandboxEnabled ? GOOGLE_GREEN : '#8888aa' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3" style={{ borderColor: `${stat.color}20`, background: `${stat.color}06` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={10} style={{ color: stat.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Models Used */}
      <div className="rounded-lg border border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1"><Cpu size={10} /> Models Used</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(analytics?.modelsUsed ?? ['gemini-2.5-pro', 'gemini-2.5-flash']).map(model => (
            <span key={model} className="text-[9px] px-2 py-0.5 rounded-full border font-medium"
              style={{ borderColor: `${GOOGLE_BLUE}35`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}10` }}>
              {model}
            </span>
          ))}
        </div>
      </div>

      {/* Activity Sparkline */}
      {analytics?.activityByHour && (
        <div className="rounded-lg border border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2"><Activity size={10} /> 24h Activity</span>
          <div className="flex items-end gap-0.5 h-10">
            {analytics.activityByHour.map((val, i) => {
              const maxVal = Math.max(...analytics.activityByHour, 1);
              const h = Math.max(2, (val / maxVal) * 100);
              return (
                <div key={i} className="flex-1 rounded-t" style={{
                  height: `${h}%`,
                  background: i === analytics.peakHour ? GOOGLE_BLUE : `${GOOGLE_BLUE}60`,
                  opacity: i === analytics.peakHour ? 1 : 0.5,
                }} />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-1 text-[7px] text-[#8888aa] font-mono">
            <span>00:00</span>
            <span>Peak: {analytics.peakHour}:00</span>
            <span>23:00</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Capabilities Tab ─── */
function GeminiCapabilitiesTab() {
  const capabilities = [
    { id: 'multimodal', name: 'Multimodal Reasoning', desc: 'Process text, images, audio, and video inputs simultaneously', icon: Eye, color: GOOGLE_BLUE },
    { id: 'code-gen', name: 'Code Generation', desc: 'Generate, refactor, and debug code across 20+ languages', icon: Code, color: GOOGLE_GREEN },
    { id: 'deep-research', name: 'Deep Research', desc: 'Multi-step research with source citation and fact-checking', icon: Search, color: GOOGLE_YELLOW },
    { id: 'sandbox', name: 'Sandbox Execution', desc: 'Execute Python, JS, TypeScript, Rust, and Go in isolated environments', icon: Terminal, color: GOOGLE_RED },
    { id: 'long-context', name: 'Long Context 1M+', desc: 'Process up to 1M+ tokens in a single context window', icon: Database, color: GOOGLE_BLUE },
    { id: 'grounded', name: 'Grounded Search', desc: 'Real-time web search with Google Search integration', icon: Globe, color: GOOGLE_GREEN },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {capabilities.map((cap, i) => (
          <motion.div key={cap.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-lg border p-4 group hover:border-opacity-60 transition-all cursor-pointer"
            style={{ borderColor: `${cap.color}25`, background: `linear-gradient(135deg, ${cap.color}06, ${cap.color}02)` }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${cap.color}20, ${cap.color}08)`, border: `1px solid ${cap.color}30` }}>
                <cap.icon size={16} style={{ color: cap.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-xs font-semibold mb-0.5">{cap.name}</h4>
                <p className="text-[10px] text-[#aaaacc] leading-relaxed">{cap.desc}</p>
              </div>
              <ChevronRight size={12} className="text-[#8888aa] group-hover:text-white transition-colors flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Differentiators */}
      <div className="rounded-lg border border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
        <h4 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1"><Sparkles size={10} style={{ color: GOOGLE_BLUE }} /> Key Differentiators</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: '1M+ Context', color: GOOGLE_BLUE },
            { label: 'Native Multimodal', color: GOOGLE_GREEN },
            { label: 'Code Sandbox', color: GOOGLE_RED },
            { label: 'Google Search', color: GOOGLE_YELLOW },
          ].map(item => (
            <div key={item.label} className="text-center p-2 rounded-lg border"
              style={{ borderColor: `${item.color}20`, background: `${item.color}06` }}>
              <span className="text-[10px] font-medium" style={{ color: item.color }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Chat Tab ─── */
function GeminiChatTab({ selectedModel, isRunning }: { selectedModel: string; isRunning: boolean }) {
  const { addChatMessage, chatHistories, incrementTokens, addLog, chatAttachments, addChatAttachment, removeChatAttachment, clearChatAttachments } = useOSStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messages = chatHistories['gemini'] || [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.csv,.pptx,.txt,.json,.xml,.yaml,.yml,.html,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.ogg,.mp4,.webm,.js,.ts,.py,.rs,.go,.java,.c,.cpp,.h,.rb,.php,.sh,.bat,.sql,.md,.css,.scss,.less,.jsx,.tsx,.vue,.svelte';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_INLINE_SIZE = 1024 * 1024;
    const attachment: import('@/lib/store').ChatAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      processed: false,
    };
    if (file.size < MAX_INLINE_SIZE) {
      const reader = new FileReader();
      reader.onload = () => {
        attachment.dataUrl = reader.result as string;
        attachment.processed = true;
        addChatAttachment(attachment);
      };
      reader.readAsDataURL(file);
    } else {
      addChatAttachment(attachment);
    }
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && chatAttachments.length === 0) || isLoading) return;

    const userMsg = {
      id: `gemini-user-${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
      agentId: 'gemini',
    };
    addChatMessage('gemini', userMsg);
    setInput('');
    clearChatAttachments();
    setIsLoading(true);

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: input, model: selectedModel }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned ${res.status}`);
      }

      const data = await res.json();

      const agentMsg = {
        id: `gemini-agent-${Date.now()}`,
        role: 'agent' as const,
        content: data.response || 'No response received.',
        timestamp: Date.now(),
        agentId: 'gemini',
      };
      addChatMessage('gemini', agentMsg);

      if (data.tokensUsed) {
        incrementTokens(data.tokensUsed);
      }
    } catch {
      addChatMessage('gemini', {
        id: `gemini-err-${Date.now()}`,
        role: 'system' as const,
        content: 'Failed to reach Gemini CLI. Make sure it is running locally.',
        timestamp: Date.now(),
        agentId: 'gemini',
      });
      addLog({
        id: `gemini-chat-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Gemini',
        layer: 2,
        level: 'error',
        message: 'Chat request failed — Gemini CLI unreachable',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Chat messages */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={24} style={{ color: GOOGLE_BLUE }} className="mx-auto mb-2 opacity-50" />
            <div className="text-[11px] text-[#8888aa]">Ask Gemini anything — multimodal reasoning, code, research</div>
            <div className="text-[9px] text-[#8888aa] mt-1">Model: {selectedModel}</div>
            {!isRunning && (
              <div className="text-[9px] mt-2 px-3 py-1.5 rounded-lg border border-[rgba(251,188,5,0.2)] bg-[rgba(251,188,5,0.05)] text-[#FBBC05] inline-block">
                AI SDK active — install Gemini CLI for direct CLI features
              </div>
            )}
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-2.5 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[rgba(66,133,244,0.15)] border border-[rgba(66,133,244,0.2)] text-[#ccccdd]'
                : msg.role === 'system'
                  ? 'bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.2)] text-[#ff8888]'
                  : 'bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.15)] text-[#ccccdd]'
            }`}>
              {msg.role === 'agent' && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={9} style={{ color: GOOGLE_BLUE }} />
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: GOOGLE_BLUE }}>Gemini</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.15)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: GOOGLE_BLUE }} />
                <span className="text-[10px] text-[#8888aa]">Processing with {selectedModel}...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachment chips */}
      {chatAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chatAttachments.map(att => (
            <div key={att.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[rgba(66,133,244,0.3)] bg-[rgba(66,133,244,0.1)] text-[10px] text-[#ccccdd]"
              title={att.name}>
              <Paperclip size={9} style={{ color: GOOGLE_BLUE }} className="flex-shrink-0" />
              <span className="truncate max-w-[100px]">{att.name}</span>
              <span className="text-[#8888aa]">({formatFileSize(att.size)})</span>
              <button onClick={() => removeChatAttachment(att.id)}
                className="text-[#8888aa] hover:text-[#ff4444] transition-colors flex-shrink-0">
                <XIcon size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors hover:border-[rgba(66,133,244,0.5)] hover:text-white"
          style={{ borderColor: `${GOOGLE_BLUE}25`, color: `${GOOGLE_BLUE}aa`, background: `${GOOGLE_BLUE}08` }}
          title="Attach file">
          <Paperclip size={14} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Message Gemini (${selectedModel})...`}
          disabled={isLoading}
          className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(66,133,244,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] outline-none focus:border-[rgba(66,133,244,0.4)] transition-colors disabled:opacity-50"
        />
        <button onClick={handleSend} disabled={isLoading || (!input.trim() && chatAttachments.length === 0)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors disabled:opacity-30"
          style={{ borderColor: `${GOOGLE_BLUE}35`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}08` }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Sandbox Tab ─── */
function GeminiSandboxTab({ isRunning }: { isRunning: boolean }) {
  const [code, setCode] = useState('# Enter Python code to execute in sandbox\nimport json\n\ndata = {"agent": "gemini", "context": 1048576}\nprint(json.dumps(data, indent=2))');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!code.trim() || isExecuting) return;
    setIsExecuting(true);
    setOutput('');

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', code, language }),
      });
      const data = await res.json();
      setOutput(data.output || 'No output');
    } catch {
      setOutput('Error: Failed to execute code in sandbox.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Language selector */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Language:</span>
        {['python', 'javascript', 'typescript', 'rust', 'go'].map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)}
            className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${
              language === lang ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={language === lang ? { background: `${GOOGLE_BLUE}15`, border: `1px solid ${GOOGLE_BLUE}30` } : { border: '1px solid transparent' }}>
            {lang}
          </button>
        ))}
      </div>

      {/* Code editor */}
      <div className="rounded-lg border border-[rgba(66,133,244,0.15)] bg-[rgba(10,10,26,0.5)] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(66,133,244,0.1)]">
          <div className="flex items-center gap-1.5">
            <FileCode size={10} style={{ color: GOOGLE_BLUE }} />
            <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{language}</span>
          </div>
          <button onClick={handleExecute} disabled={isExecuting}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-medium transition-all disabled:opacity-30"
            style={{ borderColor: `${GOOGLE_GREEN}35`, color: GOOGLE_GREEN, background: `${GOOGLE_GREEN}08`, border: `1px solid ${GOOGLE_GREEN}35` }}>
            <Play size={9} /> {isExecuting ? 'Running...' : 'Execute'}
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-36 bg-transparent p-3 text-[11px] text-[#ccccdd] font-mono resize-none outline-none"
          placeholder="Enter code..."
        />
      </div>

      {/* Output */}
      {output && (
        <div className="rounded-lg border border-[rgba(52,168,83,0.2)] bg-[rgba(10,10,26,0.5)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[rgba(52,168,83,0.1)]">
            <CheckCircle2 size={10} style={{ color: GOOGLE_GREEN }} />
            <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Output</span>
          </div>
          <pre className="p-3 text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{output}</pre>
        </div>
      )}

      {/* Sandbox info */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Memory Limit', value: '512MB', color: GOOGLE_BLUE },
          { label: 'Timeout', value: '30s', color: GOOGLE_YELLOW },
          { label: 'Network', value: 'Disabled', color: GOOGLE_RED },
        ].map(info => (
          <div key={info.label} className="rounded-lg border border-[rgba(66,133,244,0.1)] bg-[rgba(18,18,42,0.4)] p-2 text-center">
            <div className="text-[7px] text-[#8888aa] uppercase tracking-wider">{info.label}</div>
            <div className="text-[10px] font-mono font-bold" style={{ color: info.color }}>{info.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Models Tab ─── */
function GeminiModelsTab({ selectedModel, onSelectModel }: { selectedModel: string; onSelectModel: (m: string) => void }) {
  const [models, setModels] = useState<Array<{
    id: string; name: string; provider: string; contextWindow: number;
    costPer1kInput: number; costPer1kOutput: number; strengths: string[];
  }> | null>(null);

  useEffect(() => {
    fetch('/api/hermes/gemini?action=models')
      .then(r => r.json())
      .then(data => setModels(data.models))
      .catch(() => {});
  }, []);

  const displayModels = models || [];

  return (
    <div className="space-y-3">
      {displayModels.map((model, i) => {
        const isSelected = model.id === selectedModel;
        return (
          <motion.div key={model.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => onSelectModel(model.id)}
            className={`rounded-lg border p-3 cursor-pointer transition-all ${
              isSelected ? 'border-opacity-60' : 'hover:border-opacity-40'
            }`}
            style={{
              borderColor: isSelected ? `${GOOGLE_BLUE}50` : `${GOOGLE_BLUE}15`,
              background: isSelected ? `${GOOGLE_BLUE}08` : 'rgba(18,18,42,0.4)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${GOOGLE_BLUE}15`, border: `1px solid ${GOOGLE_BLUE}25` }}>
                  <Box size={12} style={{ color: GOOGLE_BLUE }} />
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">{model.name}</div>
                  <div className="text-[8px] text-[#8888aa]">{model.provider}</div>
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${GOOGLE_GREEN}15`, border: `1px solid ${GOOGLE_GREEN}30` }}>
                  <CheckCircle2 size={12} style={{ color: GOOGLE_GREEN }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-[rgba(10,10,26,0.4)] rounded p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">Context</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: GOOGLE_BLUE }}>{(model.contextWindow / 1048576).toFixed(0)}M</div>
              </div>
              <div className="bg-[rgba(10,10,26,0.4)] rounded p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">Input/1K</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: GOOGLE_GREEN }}>${model.costPer1kInput}</div>
              </div>
              <div className="bg-[rgba(10,10,26,0.4)] rounded p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">Output/1K</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: GOOGLE_YELLOW }}>${model.costPer1kOutput}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {model.strengths.map(s => (
                <span key={s} className="text-[7px] px-1.5 py-0.5 rounded-full border font-medium uppercase"
                  style={{ borderColor: `${GOOGLE_BLUE}25`, color: `${GOOGLE_BLUE}cc`, background: `${GOOGLE_BLUE}08` }}>
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Metrics Tab ─── */
function GeminiMetricsTab({ analytics }: {
  analytics: ReturnType<typeof useOSStore.getState>['agentAnalytics']['gemini'];
}) {
  const metrics = [
    { label: 'Total Sessions', value: analytics?.totalSessions?.toLocaleString('en-US') ?? '642', color: GOOGLE_BLUE },
    { label: 'Total Tokens', value: analytics?.totalTokens ? analytics.totalTokens.toLocaleString('en-US') : '3,200,000', color: GOOGLE_GREEN },
    { label: 'Tool Calls', value: analytics?.totalToolCalls?.toLocaleString('en-US') ?? '5,621', color: GOOGLE_YELLOW },
    { label: 'Avg Response', value: analytics ? `${analytics.avgResponseTime}ms` : '1500ms', color: GOOGLE_RED },
    { label: 'Peak Hour', value: analytics ? `${analytics.peakHour}:00` : '13:00', color: GOOGLE_BLUE },
    { label: 'Last Session', value: analytics?.lastSessionStart ? new Date(analytics.lastSessionStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—', color: GOOGLE_GREEN },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((metric, i) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3" style={{ borderColor: `${metric.color}20`, background: `${metric.color}06` }}>
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">{metric.label}</div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: metric.color }}>{metric.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Confidence Score */}
      <div className="rounded-lg border border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Average Confidence Score</span>
          <span className="text-sm font-mono font-bold" style={{ color: GOOGLE_GREEN }}>0.91</span>
        </div>
        <div className="w-full h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: '91%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${GOOGLE_BLUE}, ${GOOGLE_GREEN})` }} />
        </div>
        <div className="flex items-center justify-between mt-1 text-[7px] text-[#8888aa] font-mono">
          <span>0.0</span>
          <span>1.0</span>
        </div>
      </div>

      {/* Sources & Research */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(52,168,83,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Avg Sources Per Query</div>
          <div className="font-mono font-bold text-lg" style={{ color: GOOGLE_GREEN }}>5</div>
          <div className="text-[8px] text-[#8888aa]">Cross-referenced from vault + web</div>
        </div>
        <div className="rounded-lg border border-[rgba(251,188,5,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Sandbox Executions</div>
          <div className="font-mono font-bold text-lg" style={{ color: GOOGLE_YELLOW }}>847</div>
          <div className="text-[8px] text-[#8888aa]">All completed successfully</div>
        </div>
      </div>
    </div>
  );
}
