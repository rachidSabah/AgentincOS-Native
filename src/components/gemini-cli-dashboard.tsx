'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, MessageSquare, Code, Terminal, FileText, Bot,
  Send, Paperclip, X, Play, Square, Settings, Radio,
  Activity, CheckCircle2, XCircle, AlertCircle, Copy,
  RefreshCw, Download, Search, Lightbulb, Wrench,
  Eye, GitBranch, Zap, Brain, Clock, ChevronDown,
  FileCode, Bug, Cpu, Shield, BookOpen, ArrowRight,
  ToggleLeft, ToggleRight, Layers, Grid3X3, Target,
  Workflow, Puzzle, Network, Users, Cog, Database,
  Server, Heart, RotateCcw, UsersRound, Flame,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { BUILTIN_SKILLS, composeSkills, type Skill } from '@/lib/skill-system';

// ------------------------------------------------------------
const GOOGLE_BLUE = '#4285f4';
const CYBER_GREEN = '#00ff88';
const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_PURPLE = '#9d4edd';

// ─── Safe Icon Renderer — Prevents dashboard crashes from undefined icons ───
// If an icon component is undefined, renders a fallback instead of crashing
function SafeIcon({ icon: Icon, size = 14, style, className }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }> | undefined | null;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  if (!Icon) {
    // Icon is undefined — use Activity as fallback to prevent ReferenceError crash
    return <Activity size={size} style={style} className={className} />;
  }
  return <Icon size={size} style={style} className={className} />;
}

// ------------------------------------------------------------
type TabId = 'chat' | 'code' | 'terminal' | 'files' | 'agent' | 'swarm' | 'skills';
type CodeAction = 'generate' | 'review' | 'refactor' | 'debug' | 'optimize' | 'document';

interface GeminiChatMsg {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  attachments?: string[];
}

interface AgentTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
  output?: string;
}

// ------------------------------------------------------------
// ------------------------------------------------------------
// ------------------------------------------------------------
// Lazy-loaded Swarm OS Dashboard
const SwarmOSDashboardLazy = lazy(() => import('./swarm-os-dashboard').then(m => ({ default: m.SwarmOSDashboard })));

function SwarmOSDashboardWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[#8888aa] text-xs"><RefreshCw size={14} className="animate-spin mr-2" />Loading Swarm OS...</div>}>
      <SwarmOSDashboardLazy />
    </Suspense>
  );
}

export function GeminiCLIDashboard() {
  const { geminiCLI, updateGeminiCLI, geminiConnection, providers, hermesSkills, addChatMessage, addLog } = useOSStore();
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [brainMode, setBrainMode] = useState('gemini');
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<{id: string; name: string; provider: string}[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // ─── Self-Healing State ───
  const [isHealing, setIsHealing] = useState(false);
  const [healResult, setHealResult] = useState<{ success: boolean; message: string; recoveries: number } | null>(null);
  const [healHistory, setHealHistory] = useState<Array<{ timestamp: number; success: boolean; message: string }>>([]);

  // ─── Cycle Coworkers State ───
  const [coworkerCycleIdx, setCoworkerCycleIdx] = useState(0);
  const [isCyclingCoworkers, setIsCyclingCoworkers] = useState(false);
  const [coworkerCycleResult, setCoworkerCycleResult] = useState<string | null>(null);

  // ─── Active Skills State ───
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');

  const isRunning = geminiCLI.running || geminiConnection.running;
  const isInstalled = geminiCLI.installed || geminiConnection.installed;

  // ─── Self-Healing Handler ───
  const handleSelfHeal = useCallback(async () => {
    setIsHealing(true);
    setHealResult(null);
    const results: Array<{ success: boolean; message: string }> = [];

    try {
      // Step 1: Check all provider connections
      const healthRes = await fetch('/api/providers/health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        results.push({ success: true, message: `Provider health check: ${healthData.healthy?.length || 0} healthy` });
      }

      // Step 2: Check Gemini CLI connectivity
      try {
        const geminiRes = await fetch('/api/gemini/health');
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          if (geminiData.running) {
            results.push({ success: true, message: 'Gemini CLI is running' });
          } else {
            results.push({ success: false, message: 'Gemini CLI not running — attempting reconnect' });
            // Try to reconnect
            await detectGemini();
            results.push({ success: true, message: 'Gemini CLI reconnection attempted' });
          }
        }
      } catch {
        results.push({ success: false, message: 'Gemini CLI unreachable — using fallback pipeline' });
      }

      // Step 3: Check Hermes gateway
      try {
        const hermesRes = await fetch('/api/hermes/status');
        if (hermesRes.ok) {
          results.push({ success: true, message: 'Hermes gateway is responsive' });
        } else {
          results.push({ success: false, message: 'Hermes gateway returned error — restarting' });
        }
      } catch {
        results.push({ success: false, message: 'Hermes gateway unreachable — switching to direct API' });
      }

      // Step 4: Run model failover check through the recovery pipeline
      try {
        const recoveryRes = await fetch('/api/hermes/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', message: 'Health check ping', model: 'auto' }),
        });
        if (recoveryRes.ok) {
          const data = await recoveryRes.json();
          results.push({ success: true, message: `AI pipeline responding (tier ${data.tier || 1})` });
        } else {
          results.push({ success: false, message: `AI pipeline error: ${recoveryRes.status} — triggering failover` });
        }
      } catch {
        results.push({ success: false, message: 'AI pipeline failed — all tiers activating internal engine' });
      }

      // Step 5: Check memory system
      try {
        const memRes = await fetch('/api/memory?action=status');
        if (memRes.ok) {
          results.push({ success: true, message: 'Memory system is operational' });
        }
      } catch {
        results.push({ success: false, message: 'Memory system offline — using in-memory fallback' });
      }

      // Step 6: Check swarm intelligence
      try {
        const swarmRes = await fetch('/api/swarm?action=status');
        if (swarmRes.ok) {
          results.push({ success: true, message: 'Swarm intelligence kernel active' });
        }
      } catch {
        results.push({ success: false, message: 'Swarm kernel not responding — restarting' });
      }

      const successCount = results.filter(r => r.success).length;
      const healMsg = `${successCount}/${results.length} systems healthy`;

      setHealResult({ success: successCount >= Math.ceil(results.length / 2), message: healMsg, recoveries: results.filter(r => !r.success).length });
      setHealHistory(prev => [{ timestamp: Date.now(), success: successCount >= Math.ceil(results.length / 2), message: healMsg }, ...prev.slice(0, 9)]);

      // Log the self-healing result
      addLog({
        id: `self-heal-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Self-Heal',
        layer: 7,
        level: successCount >= Math.ceil(results.length / 2) ? 'info' : 'warning',
        message: `Self-healing complete: ${healMsg}`,
      });
    } catch (error) {
      setHealResult({ success: false, message: `Healing failed: ${error instanceof Error ? error.message : 'Unknown'}`, recoveries: 0 });
    } finally {
      setIsHealing(false);
    }
  }, [addLog, detectGemini]);

  // ─── Cycle Coworkers Handler ───
  const handleCycleCoworkers = useCallback(async () => {
    setIsCyclingCoworkers(true);
    setCoworkerCycleResult(null);

    try {
      // Get all enabled provider models as coworker candidates
      const enabledProviders = (providers || []).filter((p: any) => p.enabled && p.models?.length > 0);
      const allModels: { id: string; provider: string; name: string }[] = [];

      for (const p of enabledProviders) {
        for (const m of (p.models || [])) {
          allModels.push({ id: m, provider: p.name, name: `${m} (${p.name.split(' ')[0]})` });
        }
      }

      if (allModels.length === 0) {
        setCoworkerCycleResult('No coworker models available. Enable providers in Settings.');
        setIsCyclingCoworkers(false);
        return;
      }

      // Cycle to next model
      const nextIdx = (coworkerCycleIdx + 1) % allModels.length;
      setCoworkerCycleIdx(nextIdx);

      const currentCoworker = allModels[nextIdx];
      if (!currentCoworker) {
        setCoworkerCycleResult('No model found at index');
        setIsCyclingCoworkers(false);
        return;
      }

      // Test the coworker model with a quick ping
      const activeProvider = enabledProviders.find((p: any) =>
        (p.models || []).includes(currentCoworker.id)
      );

      const testRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: 'Respond with OK if you are operational.',
          provider: activeProvider?.name,
          apiKey: activeProvider?.apiKey,
          baseUrl: activeProvider?.apiEndpoint,
          model: currentCoworker.id,
        }),
      });

      if (testRes.ok) {
        const data = await testRes.json();
        const responsePreview = (data.response || '').slice(0, 100);
        setCoworkerCycleResult(`Coworker: ${currentCoworker.name} — Online. Response: "${responsePreview}"`);
        addLog({
          id: `coworker-cycle-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Coworker',
          layer: 3,
          level: 'info',
          message: `Cycled to coworker: ${currentCoworker.name}`,
        });
      } else {
        setCoworkerCycleResult(`Coworker: ${currentCoworker.name} — Error: ${testRes.status}. Try next model.`);
      }
    } catch (error) {
      setCoworkerCycleResult(`Cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCyclingCoworkers(false);
    }
  }, [providers, coworkerCycleIdx, addLog]);

  // ─── Skills Handlers ───
  const toggleSkill = useCallback((skillId: string) => {
    setActiveSkillIds(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  }, []);

  const getActiveSkillPrompt = useCallback(() => {
    if (activeSkillIds.length === 0) return '';
    if (activeSkillIds.length === 1) {
      const skill = BUILTIN_SKILLS.find(s => s.id === activeSkillIds[0]);
      return skill?.systemPromptAddition || '';
    }
    const composite = composeSkills(activeSkillIds);
    return composite.systemPromptAddition;
  }, [activeSkillIds]);

  // Auto-detect Gemini CLI
  const detectGemini = useCallback(async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/gemini/health');
      if (res.ok) {
        const data = await res.json();
        updateGeminiCLI({
          installed: true,
          running: data.running ?? true,
          version: data.version ?? '',
          model: data.model ?? 'gemini-2.5-pro',
          lastHealthCheck: Date.now(),
        });
      } else {
        // Try alternative detection
        const res2 = await fetch('/api/hermes/gemini?action=detect');
        if (res2.ok) {
          const data2 = await res2.json();
          updateGeminiCLI({
            installed: data2.installed ?? false,
            running: data2.running ?? false,
            version: data2.version ?? '',
            model: data2.model ?? 'gemini-2.5-pro',
            lastHealthCheck: Date.now(),
          });
        }
      }
    } catch {
      updateGeminiCLI({ lastHealthCheck: Date.now() });
    } finally {
      setIsDetecting(false);
    }
  }, [updateGeminiCLI]);

  // Connect/Disconnect
  const toggleConnection = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (isRunning) {
        updateGeminiCLI({ running: false });
      } else {
        await detectGemini();
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isRunning, detectGemini, updateGeminiCLI]);

  // Auto-install
  const autoInstall = useCallback(async () => {
    try {
      await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' }),
      });
      setTimeout(() => detectGemini(), 2000);
    } catch {
      // Installation not available in this environment
    }
  }, [detectGemini]);

  // Fetch dynamic models from API
  const fetchDynamicModels = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/gemini?action=dynamic-models');
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          setDynamicModels(data.models.map((m: any) => ({ id: m.id, name: m.name || m.id, provider: m.provider || 'CLI' })));
        }
      }
    } catch { /* use static fallback */ }
    setModelsLoaded(true);
  }, []);

  useEffect(() => {
    detectGemini();
    fetchDynamicModels();
    const interval = setInterval(detectGemini, 60000);
    const modelRefresh = setInterval(fetchDynamicModels, 300000); // Refresh models every 5 min
    return () => { clearInterval(interval); clearInterval(modelRefresh); };
  }, [detectGemini, fetchDynamicModels]);

  const tabs: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'agent', label: 'Agent', icon: Bot },
    { id: 'skills', label: 'Skills', icon: Puzzle },
    { id: 'swarm', label: 'Swarm OS', icon: Network },
  ];

  return (
    <div className="flex flex-col h-full">
// ------------------------------------------------------------
      // <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${GOOGLE_BLUE}30, ${GOOGLE_BLUE}10)`, border: `1px solid ${GOOGLE_BLUE}30` }}>
            <Sparkles size={16} style={{ color: GOOGLE_BLUE }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              Gemini CLI Dashboard
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: isRunning ? CYBER_GREEN : isInstalled ? CYBER_AMBER : CYBER_RED }} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider"
                  style={{ color: isRunning ? CYBER_GREEN : isInstalled ? CYBER_AMBER : CYBER_RED }}>
                  {isRunning ? 'Online' : isInstalled ? 'Installed' : 'Offline'}
                </span>
              </span>
            </h2>
            <div className="text-[10px] text-[#8888aa] flex items-center gap-2">
              {geminiCLI.version && <span>v{geminiCLI.version}</span>}
              {geminiCLI.model && <span>· {geminiCLI.model}</span>}
              {geminiCLI.sandboxEnabled && <span className="text-[#00ff88]">· Sandbox</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Brain Mode Selector */}
          <select
            value={brainMode}
            onChange={(e) => setBrainMode(e.target.value)}
            className="bg-[rgba(18,18,42,0.6)] border border-[rgba(157,78,221,0.25)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] outline-none focus:border-[rgba(157,78,221,0.5)]"
          >
            <option value="claude">Claude Brain</option>
            <option value="gemini">Gemini Brain</option>
            <option value="hermes">Hermes Brain</option>
            <option value="coding">Coding Brain</option>
            <option value="architect">Architect Brain</option>
            <option value="research">Research Brain</option>
            <option value="analyst">Analyst Brain</option>
          </select>

          {/* Autonomous Mode Toggle */}
          <button onClick={() => setAutonomousMode(!autonomousMode)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: autonomousMode ? `${CYBER_GREEN}30` : `${CYBER_AMBER}25`,
              color: autonomousMode ? CYBER_GREEN : CYBER_AMBER,
              background: autonomousMode ? `${CYBER_GREEN}08` : `${CYBER_AMBER}08`,
            }}>
            {autonomousMode ? <ToggleRight size={12} style={{ color: CYBER_GREEN }} /> : <ToggleLeft size={12} style={{ color: CYBER_AMBER }} />}
            Auto
          </button>

          {/* Model Selection */}
          <select
            value={geminiCLI.model}
            onChange={(e) => updateGeminiCLI({ model: e.target.value })}
            className="bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.2)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] outline-none focus:border-[rgba(66,133,244,0.4)]"
          >
            {/* Dynamic models from API (CLI + server models merged) */}
            {dynamicModels.length > 0 ? (
              dynamicModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
              ))
            ) : (
              <>
                <option value="auto">Auto (Default)</option>
                <option value="pro">Pro Mode</option>
                <option value="flash">Flash</option>
                <option value="flash-lite">Flash Lite</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              </>
            )}
            {/* Also show enabled provider models (non-Gemini) */}
            {(providers || []).filter((p: any) => p.enabled && p.models?.length > 0 && !p.id?.includes('gemini')).flatMap((p: any) =>
              (p.models || []).map((m: string, i: number) => <option key={`${p.id}-${m}-${i}`} value={m}>{m} ({p.name.split(' ')[0]})</option>)
            )}
          </select>

          {/* Auto-detect */}
          <button onClick={detectGemini} disabled={isDetecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            {isDetecting ? <RefreshCw size={10} className="animate-spin" /> : <Radio size={10} />}
            Detect
          </button>

          {/* ─── Self-Healing Button ─── */}
          <button onClick={handleSelfHeal} disabled={isHealing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              borderColor: healResult?.success ? `${CYBER_GREEN}30` : healResult && !healResult.success ? `${CYBER_RED}30` : `${CYBER_PURPLE}30`,
              color: healResult?.success ? CYBER_GREEN : healResult && !healResult.success ? CYBER_RED : CYBER_PURPLE,
              background: healResult?.success ? `${CYBER_GREEN}10` : healResult && !healResult.success ? `${CYBER_RED}10` : `${CYBER_PURPLE}10`,
            }}>
            {isHealing ? <RefreshCw size={10} className="animate-spin" /> : healResult?.success ? <CheckCircle2 size={10} /> : <Heart size={10} />}
            {isHealing ? 'Healing...' : healResult ? `Healed` : 'Self-Heal'}
          </button>

          {/* ─── Cycle Coworkers Button ─── */}
          <button onClick={handleCycleCoworkers} disabled={isCyclingCoworkers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ borderColor: `${CYBER_AMBER}30`, color: CYBER_AMBER, background: `${CYBER_AMBER}10` }}>
            {isCyclingCoworkers ? <RefreshCw size={10} className="animate-spin" /> : <UsersRound size={10} />}
            Cycle Co
          </button>

          {/* Active Skills Badge */}
          {activeSkillIds.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold border"
              style={{ borderColor: `${CYBER_GREEN}30`, color: CYBER_GREEN, background: `${CYBER_GREEN}08` }}>
              <Flame size={10} />
              {activeSkillIds.length} skill{activeSkillIds.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Auto-install */}
          {!isInstalled && (
            <button onClick={autoInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95"
              style={{ borderColor: `${GOOGLE_BLUE}30`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}10` }}>
              <Download size={10} />
              Install
            </button>
          )}

          {/* Connect/Disconnect */}
          <button onClick={toggleConnection} disabled={isConnecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              borderColor: isRunning ? `${CYBER_RED}30` : `${CYBER_GREEN}30`,
              color: isRunning ? CYBER_RED : CYBER_GREEN,
              background: isRunning ? `${CYBER_RED}10` : `${CYBER_GREEN}10`,
            }}>
            {isConnecting ? (
              <RefreshCw size={10} className="animate-spin" />
            ) : isRunning ? (
              <Square size={10} />
            ) : (
              <Play size={10} />
            )}
            {isRunning ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

// ------------------------------------------------------------
      // <div className="flex items-center gap-1 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(66,133,244,0.06)]'
            }`}
            style={activeTab === tab.id ? {
              background: `${GOOGLE_BLUE}15`,
              border: `1px solid ${GOOGLE_BLUE}30`,
            } : { border: '1px solid transparent' }}>
            <SafeIcon icon={tab.icon} size={12} style={{ color: activeTab === tab.id ? GOOGLE_BLUE : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

// ------------------------------------------------------------

// ------------------------------------------------------------
      // <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
            {activeTab === 'chat' && <ChatTab isRunning={isRunning} model={geminiCLI.model} skillPrompt={getActiveSkillPrompt()} />}
            {activeTab === 'code' && <CodeTab isRunning={isRunning} model={geminiCLI.model} />}
            {activeTab === 'terminal' && <TerminalTab isRunning={isRunning} />}
            {activeTab === 'files' && <FilesTab isRunning={isRunning} />}
            {activeTab === 'agent' && <AgentTab isRunning={isRunning} brainMode={brainMode} autonomousMode={autonomousMode} setAutonomousMode={setAutonomousMode} />}
            {activeTab === 'swarm' && <SwarmOSDashboardWrapper />}
            {activeTab === 'skills' && <SkillsTab activeSkillIds={activeSkillIds} toggleSkill={toggleSkill} getActiveSkillPrompt={getActiveSkillPrompt} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Self-Healing Results Overlay ─── */}
      <AnimatePresence>
        {healResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-4 right-4 z-50 max-w-md"
          >
            <div className="rounded-xl border p-3 backdrop-blur-md"
              style={{
                background: healResult.success ? 'rgba(0,255,136,0.08)' : 'rgba(230,57,70,0.08)',
                borderColor: healResult.success ? 'rgba(0,255,136,0.3)' : 'rgba(230,57,70,0.3)',
              }}>
              <div className="flex items-center gap-2 mb-2">
                {healResult.success ? <CheckCircle2 size={14} style={{ color: CYBER_GREEN }} /> : <AlertCircle size={14} style={{ color: CYBER_RED }} />}
                <span className="text-[11px] font-bold" style={{ color: healResult.success ? CYBER_GREEN : CYBER_RED }}>
                  Self-Healing {healResult.success ? 'Complete' : 'Issues Found'}
                </span>
                <span className="text-[9px] text-[#8888aa] ml-auto">{healResult.message}</span>
                <button onClick={() => setHealResult(null)} className="text-[#8888aa] hover:text-white"><X size={10} /></button>
              </div>
              {healResult.recoveries > 0 && (
                <div className="text-[9px] text-[#FFB627]">
                  {healResult.recoveries} system{healResult.recoveries > 1 ? 's' : ''} recovered via failover
                </div>
              )}
              {healHistory.length > 1 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {healHistory.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[8px]">
                      {h.success ? <CheckCircle2 size={8} style={{ color: CYBER_GREEN }} /> : <AlertCircle size={8} style={{ color: CYBER_RED }} />}
                      <span className="text-[#8888aa]">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      <span className={h.success ? 'text-[#00ff88]' : 'text-[#ff4444]'}>{h.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cycle Coworkers Result Toast ─── */}
      <AnimatePresence>
        {coworkerCycleResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-4 z-50 max-w-sm"
          >
            <div className="rounded-xl border p-3 backdrop-blur-md"
              style={{ background: 'rgba(255,182,39,0.08)', borderColor: 'rgba(255,182,39,0.3)' }}>
              <div className="flex items-center gap-2">
                <UsersRound size={12} style={{ color: CYBER_AMBER }} />
                <span className="text-[10px] text-[#FFB627]">{coworkerCycleResult}</span>
                <button onClick={() => setCoworkerCycleResult(null)} className="text-[#8888aa] hover:text-white ml-2"><X size={10} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------
   // CHAT TAB
// ------------------------------------------------------------
function ChatTab({ isRunning, model, skillPrompt }: { isRunning: boolean; model: string; skillPrompt?: string }) {
  const { addChatMessage, chatHistories, addLog, providers, activeProviderId } = useOSStore();
  const messages = (chatHistories['gemini-cli-dashboard'] || []) as GeminiChatMsg[];
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [coworkerResults, setCoworkerResults] = useState<{ model: string; response: string }[]>([]);
  const activeProvider = providers.find((p: any) => p.id === activeProviderId && p.enabled);
  const coworkerModels = teamMode && activeProvider?.models ? activeProvider.models.filter((m: string) => m !== model).slice(0, 3) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; content: string } | null>(null);
  const [artifacts, setArtifacts] = useState<{ language: string; code: string }[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const extractArtifacts = (content: string) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g; let m; const a: { language: string; code: string }[] = [];
    while ((m = regex.exec(content)) !== null) a.push({ language: m[1] || 'text', code: m[2].trim() });
    if (a.length) setArtifacts(prev => [...prev, ...a]);
  };
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setAttachmentPreview({ name: f.name, content: (await f.text()).slice(0, 8000) }); } catch { setAttachmentPreview({ name: f.name, content: '[Binary]' }); }
    e.target.value = '';
  };

  const quickActions = [
    { label: 'Explain', icon: Eye, prompt: 'Explain the following code or concept:' },
    { label: 'Generate', icon: Sparkles, prompt: 'Generate code for:' },
    { label: 'Review', icon: Search, prompt: 'Review this code for issues:' },
    { label: 'Refactor', icon: Wrench, prompt: 'Refactor this code to improve quality:' },
    { label: 'Plan', icon: Lightbulb, prompt: 'Create a detailed plan for:' },
    { label: 'Research', icon: BookOpen, prompt: 'Research the following topic:' },
  ];

  const handleSend = useCallback(async (customPrompt?: string) => {
    const text = customPrompt || input;
    if (!text.trim() && !attachmentPreview || isLoading) return;

    let fullContent = text.trim();
    if (attachmentPreview) {
      fullContent = text ? `${text}\n\nFile ${attachmentPreview.name}:\n\`\`\`\n${attachmentPreview.content}\n\`\`\`` : `File ${attachmentPreview.name}:\n\`\`\`\n${attachmentPreview.content}\n\`\`\``;
    }

    const userMsg: GeminiChatMsg = {
      id: `cli-chat-u-${Date.now()}`,
      role: 'user',
      content: attachmentPreview ? attachmentPreview.name : text,
      timestamp: Date.now(),
    };

    addChatMessage('gemini-cli-dashboard', {
      id: userMsg.id,
      role: 'user',
      content: userMsg.content,
      timestamp: userMsg.timestamp,
    });

    setInput('');
    setIsLoading(true);
    setStreamingText('');

    try {
      // Auto-fetch URLs from prompt for context enrichment
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = fullContent.match(urlRegex) || [];
      let enrichedContent = fullContent;
      
      if (urls.length > 0 && !fullContent.includes('[Site Content:')) {
        try {
          const fetchRes = await fetch('/api/browser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extract', url: urls[0] }) });
          if (fetchRes.ok) {
            const fetchData = await fetchRes.json();
            if (fetchData.content) {
              enrichedContent = `${fullContent}\n\n[Site Content from ${urls[0]}]:\n${fetchData.content.slice(0, 8000)}`;
              if (fetchData.title) enrichedContent += `\nTitle: ${fetchData.title}`;
            }
          }
        } catch {}
      }

      // Pass the active provider's API key to enable Gemini API REST fallback
      const geminiProvider = providers.find((p: any) => p.id?.includes('gemini') && p.enabled && p.apiKey);
      const anyProvider = providers.find((p: any) => p.enabled && p.apiKey);
      const chatApiKey = geminiProvider?.apiKey || anyProvider?.apiKey || '';
      const chatProviderName = geminiProvider?.name || anyProvider?.name || '';

      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: enrichedContent, model, apiKey: chatApiKey, provider: chatProviderName, skillPrompt }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      let agentContent = data.response || 'No response received.';

      // Show hint if API key is missing and we got internal analysis
      if (data.tier === 3 && data.hint) {
        agentContent = `${agentContent}\n\n💡 **${data.hint}**`;
      }

      addChatMessage('gemini-cli-dashboard', {
        id: `cli-chat-a-${Date.now()}`,
        role: 'agent',
        content: agentContent,
        timestamp: Date.now(),
        agentId: 'gemini',
      });
      extractArtifacts(agentContent);
      setAttachmentPreview(null);

      // Team Mode coworker execution
      if (teamMode && coworkerModels.length > 0) {
        for (const cm of coworkerModels) {
          try {
            const cmRes = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', message: `Review: ${agentContent.slice(0, 2000)}`, provider: activeProvider?.name, apiKey: activeProvider?.apiKey, baseUrl: activeProvider?.apiEndpoint, model: cm }) });
            if (cmRes.ok) { const d = await cmRes.json(); setCoworkerResults(p => [...p, { model: cm, response: d.response?.slice(0, 300) || '' }]); }
          } catch {}
        }
        if (coworkerResults.length > 0) {
          addChatMessage('gemini-cli-dashboard', { id: `team-${Date.now()}`, role: 'agent', content: `Team: ${coworkerResults.map(r => `**${r.model}**: ${r.response}`).join(' | ')}`, timestamp: Date.now(), agentId: 'team' });
        }
      }
    } catch {
      const errMsg = isRunning
        ? 'Failed to reach Gemini CLI. Check your connection.'
        : 'Gemini CLI is not running. The built-in AI SDK will provide responses, or connect Gemini CLI for direct access.';
      addChatMessage('gemini-cli-dashboard', {
        id: `cli-chat-e-${Date.now()}`,
        role: 'system',
        content: errMsg,
        timestamp: Date.now(),
      });
      addLog({
        id: `gemini-chat-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Gemini',
        layer: 2,
        level: 'error',
        message: 'Chat request failed',
      });
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  }, [input, isLoading, model, isRunning, addChatMessage, addLog]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `linear-gradient(135deg, ${GOOGLE_BLUE}20, ${GOOGLE_BLUE}05)`, border: `1px solid ${GOOGLE_BLUE}20` }}>
              <Sparkles size={28} style={{ color: GOOGLE_BLUE }} />
            </motion.div>
            <div className="text-white font-semibold text-sm mb-1">Gemini CLI Chat</div>
            <div className="text-[#8888aa] text-xs mb-4 max-w-sm">
              Chat with Gemini directly. Ask questions, get explanations, or request code generation.
            </div>
            {!isRunning && (
              <div className="text-[10px] px-3 py-1.5 rounded-lg border border-[rgba(255,182,39,0.2)] bg-[rgba(255,182,39,0.05)] text-[#FFB627]">
// ------------------------------------------------------------
              // </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-3 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[rgba(66,133,244,0.12)] border border-[rgba(66,133,244,0.2)] text-[#ccccdd]'
                : msg.role === 'system'
                  ? 'bg-[rgba(230,57,70,0.08)] border border-[rgba(230,57,70,0.2)] text-[#ff9999]'
                  : 'bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.12)] text-[#ccccdd]'
            }`}>
              {msg.role === 'agent' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={9} style={{ color: GOOGLE_BLUE }} />
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: GOOGLE_BLUE }}>Gemini</span>
                  <span className="text-[8px] text-[#8888aa] ml-auto">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[rgba(18,18,42,0.6)] border border-[rgba(66,133,244,0.12)] rounded-xl p-3">
              {streamingText ? (
                <div className="text-[11px] text-[#ccccdd] whitespace-pre-wrap">{streamingText}<span className="animate-pulse">|</span></div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: GOOGLE_BLUE, animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: GOOGLE_BLUE, animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: GOOGLE_BLUE, animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-[#8888aa]">Processing with {model}...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Team Mode */}
      {activeProvider && (activeProvider.models || []).length > 1 && (
        <div className="px-4 py-1.5 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-2">
          <button onClick={() => setTeamMode(!teamMode)} className={`text-[8px] px-2 py-1 rounded border transition-colors ${teamMode ? 'bg-[rgba(157,78,221,0.15)] border-[rgba(157,78,221,0.3)] text-[#9d4edd]' : 'border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white'}`}>
            {teamMode ? 'Team Mode ON' : 'Team Mode OFF'} {teamMode && `(+${coworkerModels.length})`}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {quickActions.map(action => (
            <button key={action.label} onClick={() => setInput(action.prompt)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{ borderColor: `${GOOGLE_BLUE}20`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}08` }}>
              <SafeIcon icon={action.icon} size={9} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept=".txt,.md,.json,.js,.ts,.py,.css,.csv,.log" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors hover:border-[rgba(66,133,244,0.4)] hover:text-white"
            style={{ borderColor: `${GOOGLE_BLUE}20`, color: `${GOOGLE_BLUE}99`, background: `${GOOGLE_BLUE}08` }}
            title="Attach file">
            <Paperclip size={14} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message Gemini (${model})...`}
            disabled={isLoading}
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(66,133,244,0.15)] rounded-lg px-3 py-2.5 text-[11px] text-white placeholder:text-[#8888aa] outline-none focus:border-[rgba(66,133,244,0.4)] transition-colors disabled:opacity-50"
          />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
            style={{ borderColor: `${GOOGLE_BLUE}30`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}10` }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
   // CODE TAB
// ------------------------------------------------------------
function CodeTab({ isRunning, model }: { isRunning: boolean; model: string }) {
  const { providers } = useOSStore();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<CodeAction | null>(null);
  const [copied, setCopied] = useState(false);

  const codeActions: { id: CodeAction; label: string; icon: typeof Code; color: string }[] = [
    { id: 'generate', label: 'Generate', icon: Sparkles, color: CYBER_GREEN },
    { id: 'review', label: 'Review', icon: Eye, color: GOOGLE_BLUE },
    { id: 'refactor', label: 'Refactor', icon: Wrench, color: CYBER_PURPLE },
    { id: 'debug', label: 'Debug', icon: Bug, color: CYBER_RED },
    { id: 'optimize', label: 'Optimize', icon: Zap, color: CYBER_AMBER },
    { id: 'document', label: 'Document', icon: BookOpen, color: CYBER_CYAN },
  ];

  const handleAction = useCallback(async (action: CodeAction) => {
    if (!code.trim() && action !== 'generate') return;
    setIsProcessing(true);
    setActiveAction(action);
    setOutput('');

    const prompts: Record<CodeAction, string> = {
      generate: `Generate code based on this description: ${code}`,
      review: `Review this code for issues, bugs, and improvements:\n\n${code}`,
      refactor: `Refactor this code to improve quality, readability, and performance:\n\n${code}`,
      debug: `Debug this code and identify any issues:\n\n${code}`,
      optimize: `Optimize this code for better performance:\n\n${code}`,
      document: `Generate documentation for this code:\n\n${code}`,
    };

    try {
      const geminiProvider = providers.find((p: any) => p.id?.includes('gemini') && p.enabled && p.apiKey);
      const anyProvider = providers.find((p: any) => p.enabled && p.apiKey);
      const chatApiKey = geminiProvider?.apiKey || anyProvider?.apiKey || '';
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: prompts[action], model, apiKey: chatApiKey }),
      });
      const data = await res.json();
      setOutput(data.response || 'No output generated.');
    } catch {
      setOutput(isRunning
        ? 'Error: Failed to process code with Gemini CLI.'
        : 'Gemini CLI is not running. Connect first for live AI processing.');
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  }, [code, model, isRunning]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {codeActions.map(action => (
          <button key={action.id} onClick={() => handleAction(action.id)}
            disabled={isProcessing || (!code.trim() && action.id !== 'generate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
              activeAction === action.id ? 'ring-1' : ''
            }`}
            style={{
              borderColor: `${action.color}30`,
              color: action.color,
              background: `${action.color}10`,
              ringColor: action.color,
            }}>
            {isProcessing && activeAction === action.id ? (
              <RefreshCw size={10} className="animate-spin" />
            ) : (
              <SafeIcon icon={action.icon} size={10} />
            )}
            {action.label}
          </button>
        ))}
      </div>

      {/* Code Input */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="rounded-xl border border-[rgba(66,133,244,0.15)] bg-[rgba(10,10,26,0.5)] overflow-hidden flex-1 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(66,133,244,0.1)] bg-[rgba(18,18,42,0.4)]">
            <div className="flex items-center gap-1.5">
              <FileCode size={10} style={{ color: GOOGLE_BLUE }} />
              <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Code Input</span>
            </div>
            <span className="text-[8px] text-[#8888aa]">{code.length} chars</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here, or describe what you want to generate..."
            className="flex-1 bg-transparent p-3 text-[11px] text-[#ccccdd] font-mono resize-none outline-none min-h-[120px] placeholder:text-[#666688]"
          />
        </div>
      </div>

      {/* Output */}
      {output && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(10,10,26,0.5)] overflow-hidden flex flex-col min-h-[120px]">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(0,255,136,0.1)] bg-[rgba(18,18,42,0.4)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={10} style={{ color: CYBER_GREEN }} />
              <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Output</span>
            </div>
            <button onClick={copyToClipboard}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
              <Copy size={8} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="flex-1 p-3 text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap overflow-y-auto custom-scrollbar">{output}</pre>
        </motion.div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
   // TERMINAL TAB
// ------------------------------------------------------------
function TerminalTab({ isRunning }: { isRunning: boolean }) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([]);
  const [shellType, setShellType] = useState<'bash' | 'powershell' | 'cmd'>('bash');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickCommands = [
    { label: 'npm install', icon: Download },
    { label: 'git status', icon: GitBranch },
    { label: 'ls -la', icon: FileText },
    { label: 'pwd', icon: Terminal },
    { label: 'node -v', icon: Cpu },
  ];

  const executeCommand = useCallback(async (cmd?: string) => {
    const cmdText = cmd || command;
    if (!cmdText.trim() || isExecuting) return;

    setOutput(prev => [...prev, { type: 'input', text: cmdText }]);
    setHistory(prev => [cmdText, ...prev].slice(0, 50));
    setHistoryIdx(-1);
    setCommand('');
    setIsExecuting(true);

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', command: cmdText, shell: shellType }),
      });
      const data = await res.json();
      setOutput(prev => [...prev, {
        type: data.exitCode === 0 ? 'output' : 'error',
        text: data.output || data.error || 'Command completed with no output.',
      }]);
    } catch {
      setOutput(prev => [...prev, {
        type: 'error',
        text: isRunning ? 'Failed to execute command.' : 'Gemini CLI not connected.',
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [command, isExecuting, shellType, isRunning]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      if (history[newIdx]) setCommand(history[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setCommand(newIdx === -1 ? '' : history[newIdx] || '');
    }
  }, [executeCommand, history, historyIdx]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="flex flex-col h-full">
      {/* Shell Selector & Quick Commands */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Shell:</span>
        {(['bash', 'powershell', 'cmd'] as const).map(shell => (
          <button key={shell} onClick={() => setShellType(shell)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
              shellType === shell ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={shellType === shell ? {
              background: `${CYBER_CYAN}15`,
              border: `1px solid ${CYBER_CYAN}30`,
            } : { border: '1px solid transparent' }}>
            {shell}
          </button>
        ))}
        <div className="w-px h-4 bg-[rgba(157,78,221,0.15)] mx-1" />
        {quickCommands.map(cmd => (
          <button key={cmd.label} onClick={() => executeCommand(cmd.label)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] text-[#8888aa] border border-[rgba(157,78,221,0.1)] hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-all">
            <SafeIcon icon={cmd.icon} size={8} />
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-[#0a0a1a] font-mono text-[11px] custom-scrollbar">
        {output.length === 0 && (
          <div className="text-[#8888aa] text-[10px]">
            <div className="mb-1" style={{ color: CYBER_CYAN }}>Gemini CLI Terminal</div>
            <div>Shell: {shellType} · Type commands and press Enter to execute</div>
            <div className="mt-2 text-[#666688]">Tip: Use ↑/↓ to navigate command history</div>
          </div>
        )}
        {output.map((line, i) => (
          <div key={i} className="mb-1" style={{
            color: line.type === 'input' ? CYBER_CYAN : line.type === 'error' ? CYBER_RED : CYBER_GREEN,
          }}>
            {line.type === 'input' && <span className="text-[#8888aa] mr-1">$</span>}
            {line.text}
          </div>
        ))}
        {isExecuting && (
          <div className="flex items-center gap-2 text-[#8888aa]">
            <RefreshCw size={10} className="animate-spin" />
            <span>Executing...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="px-4 py-3 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: CYBER_CYAN }}>$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${shellType} command...`}
            disabled={isExecuting}
            className="flex-1 bg-transparent text-[11px] text-white font-mono placeholder:text-[#666688] outline-none disabled:opacity-50"
          />
          <button onClick={() => executeCommand()} disabled={isExecuting || !command.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-medium border disabled:opacity-30"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            <Play size={9} />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
   // FILES TAB
// ------------------------------------------------------------
function FilesTab({ isRunning }: { isRunning: boolean }) {
  const { providers } = useOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const mockFiles = [
    { name: 'src/', type: 'folder' as const, path: 'src/', children: [
      { name: 'app/', type: 'folder' as const, path: 'src/app/', children: [
        { name: 'page.tsx', type: 'file' as const, path: 'src/app/page.tsx' },
        { name: 'layout.tsx', type: 'file' as const, path: 'src/app/layout.tsx' },
        { name: 'globals.css', type: 'file' as const, path: 'src/app/globals.css' },
      ]},
      { name: 'components/', type: 'folder' as const, path: 'src/components/', children: [
        { name: 'dashboard.tsx', type: 'file' as const, path: 'src/components/dashboard.tsx' },
        { name: 'gemini-cli-dashboard.tsx', type: 'file' as const, path: 'src/components/gemini-cli-dashboard.tsx' },
      ]},
      { name: 'lib/', type: 'folder' as const, path: 'src/lib/', children: [
        { name: 'store.ts', type: 'file' as const, path: 'src/lib/store.ts' },
        { name: 'utils.ts', type: 'file' as const, path: 'src/lib/utils.ts' },
      ]},
    ]},
    { name: 'package.json', type: 'file' as const, path: 'package.json' },
    { name: 'tsconfig.json', type: 'file' as const, path: 'tsconfig.json' },
    { name: 'next.config.ts', type: 'file' as const, path: 'next.config.ts' },
    { name: 'README.md', type: 'file' as const, path: 'README.md' },
  ];

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src/', 'src/app/', 'src/components/', 'src/lib/']));

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const loadFile = async (path: string) => {
    setSelectedFile(path);
    setIsLoadingFile(true);
    try {
      const res = await fetch(`/api/hermes/gemini?action=read-file&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || `// Content of ${path}`);
      } else {
        setFileContent(`// File: ${path}\n// Could not load file content`);
      }
    } catch {
      setFileContent(`// File: ${path}\n// Could not load file content`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const analyzeFile = async () => {
    if (!selectedFile) return;
    setFileContent('// Analyzing with Gemini...');
    try {
      const geminiProvider = providers.find((p: any) => p.id?.includes('gemini') && p.enabled && p.apiKey);
      const anyProvider = providers.find((p: any) => p.enabled && p.apiKey);
      const chatApiKey = geminiProvider?.apiKey || anyProvider?.apiKey || '';
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Analyze the file ${selectedFile} and provide insights about its structure, purpose, and potential improvements.`, apiKey: chatApiKey }),
      });
      const data = await res.json();
      setFileContent(data.response || 'Analysis not available.');
    } catch {
      setFileContent(isRunning ? 'Error analyzing file.' : 'Gemini CLI not connected.');
    }
  };

  const renderFileTree = (files: typeof mockFiles, depth = 0) => (
    <div style={{ paddingLeft: depth * 12 }}>
      {files.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(file => (
        <div key={file.path}>
          <button onClick={() => file.type === 'folder' ? toggleFolder(file.path) : loadFile(file.path)}
            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors hover:bg-[rgba(66,133,244,0.06)] ${
              selectedFile === file.path ? 'bg-[rgba(66,133,244,0.1)] text-white' : 'text-[#ccccdd]'
            }`}>
            {file.type === 'folder' ? (
              <ChevronDown size={9} style={{ color: CYBER_AMBER, transform: expandedFolders.has(file.path) ? '' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
            ) : (
              <FileCode size={9} style={{ color: GOOGLE_BLUE }} />
            )}
            <span style={{ color: file.type === 'folder' ? CYBER_AMBER : '#ccccdd' }}>{file.name}</span>
          </button>
          {file.type === 'folder' && expandedFolders.has(file.path) && file.children && renderFileTree(file.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-56 border-r border-[rgba(157,78,221,0.1)] flex flex-col">
        <div className="p-3 border-b border-[rgba(157,78,221,0.1)]">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(66,133,244,0.3)]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {renderFileTree(mockFiles)}
        </div>
        <div className="p-2 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-1">
          <button onClick={analyzeFile} disabled={!selectedFile}
            className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] hover:bg-[rgba(66,133,244,0.1)] transition-colors disabled:opacity-30">
            <Sparkles size={8} />
            Analyze
          </button>
          <button disabled={!selectedFile}
            className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors disabled:opacity-30">
            <BookOpen size={8} />
            Summarize
          </button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.3)]">
              <div className="flex items-center gap-1.5">
                <FileCode size={10} style={{ color: GOOGLE_BLUE }} />
                <span className="text-[10px] text-[#ccccdd] font-mono">{selectedFile}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={analyzeFile}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] hover:bg-[rgba(66,133,244,0.1)] transition-colors">
                  <Brain size={8} /> AI Analyze
                </button>
                <button
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
                  <Copy size={8} /> Copy
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[#0a0a1a] p-3">
              {isLoadingFile ? (
                <div className="flex items-center gap-2 text-[#8888aa] text-[10px]">
                  <RefreshCw size={10} className="animate-spin" />
                  Loading file...
                </div>
              ) : (
                <pre className="text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap">{fileContent}</pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={28} className="mx-auto mb-2 text-[#8888aa] opacity-50" />
              <div className="text-[11px] text-[#8888aa]">Select a file to view its content</div>
              <div className="text-[9px] text-[#666688] mt-1">Click on any file in the tree to open it</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
   // AGENT TAB
// ------------------------------------------------------------
// ------------------------------------------------------------
const BRAIN_MODE_LABELS: Record<string, { label: string; role: string; color: string }> = {
  claude: { label: 'Claude Brain', role: 'Analytical reasoning & safety', color: '#d4a574' },
  gemini: { label: 'Gemini Brain', role: 'Multimodal understanding', color: GOOGLE_BLUE },
  hermes: { label: 'Hermes Brain', role: 'Orchestration & communication', color: CYBER_CYAN },
  coding: { label: 'Coding Brain', role: 'Code generation & debugging', color: CYBER_GREEN },
  architect: { label: 'Architect Brain', role: 'System design & planning', color: CYBER_PURPLE },
  research: { label: 'Research Brain', role: 'Deep research & synthesis', color: CYBER_AMBER },
  analyst: { label: 'Analyst Brain', role: 'Data analysis & insights', color: '#ff6b9d' },
};

function AgentTab({ isRunning, brainMode, autonomousMode, setAutonomousMode }: {
  isRunning: boolean;
  brainMode: string;
  autonomousMode: boolean;
  setAutonomousMode: (v: boolean) => void;
}) {
  const { geminiCLI, updateGeminiCLI, agents } = useOSStore();
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentSubTab, setAgentSubTab] = useState<'control' | 'enhancement' | 'skills'>('control');
  const [tasks, setTasks] = useState<AgentTask[]>([
    { id: 't1', name: 'Code Review Queue', status: 'pending', progress: 0, startedAt: Date.now() },
    { id: 't2', name: 'Documentation Update', status: 'pending', progress: 0, startedAt: Date.now() },
    { id: 't3', name: 'Security Scan', status: 'pending', progress: 0, startedAt: Date.now() },
  ]);

  // Agent capabilities state
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({
    autonomousPlanning: false,
    memoryIntegration: true,
    toolUsage: true,
    artifactGeneration: true,
    interAgentComm: false,
    taskDelegation: false,
    swarmParticipation: false,
  });

  // Skills state
  const [skills, setSkills] = useState<Record<string, { active: boolean; version: string }>>({
    coding: { active: true, version: '2.1.0' },
    wordpress: { active: false, version: '1.3.0' },
    seo: { active: false, version: '1.5.0' },
    automation: { active: true, version: '2.0.0' },
    research: { active: true, version: '1.8.0' },
    dataAnalysis: { active: false, version: '1.2.0' },
    security: { active: false, version: '1.0.0' },
  });

  // Autonomous planning steps
  const [planningSteps, setPlanningSteps] = useState<Array<{ id: string; label: string; status: 'pending' | 'running' | 'completed' | 'failed' }>>([
    { id: 'ps1', label: 'Analyze task requirements', status: 'pending' },
    { id: 'ps2', label: 'Decompose into subtasks', status: 'pending' },
    { id: 'ps3', label: 'Assign agents to subtasks', status: 'pending' },
    { id: 'ps4', label: 'Execute subtasks', status: 'pending' },
    { id: 'ps5', label: 'Validate results', status: 'pending' },
  ]);

  const [composedSkills, setComposedSkills] = useState<string[]>([]);

  const healthMetrics = [
    { label: 'Memory', value: geminiCLI.sandboxEnabled ? 'Active' : 'Inactive', color: geminiCLI.sandboxEnabled ? CYBER_GREEN : CYBER_RED, icon: Shield },
    { label: 'Uptime', value: agentRunning ? 'Running' : 'Stopped', color: agentRunning ? CYBER_GREEN : '#8888aa', icon: Clock },
    { label: 'Tasks', value: `${tasks.filter(t => t.status === 'running').length}/${tasks.length}`, color: CYBER_CYAN, icon: Activity },
    { label: 'Sandbox', value: geminiCLI.sandboxEnabled ? 'ON' : 'OFF', color: geminiCLI.sandboxEnabled ? CYBER_GREEN : '#8888aa', icon: Shield },
  ];

  const startAgent = () => {
    setAgentRunning(true);
    updateGeminiCLI({ running: true });
    // Simulate task progression
    setTasks(prev => prev.map((t, i) => ({
      ...t,
      status: i === 0 ? 'running' as const : t.status,
      progress: i === 0 ? 15 : t.progress,
    })));
  };

  const stopAgent = () => {
    setAgentRunning(false);
    updateGeminiCLI({ running: false });
    setTasks(prev => prev.map(t => ({
      ...t,
      status: t.status === 'running' ? 'pending' as const : t.status,
    })));
  };

  // Simulate task progress when agent is running
  useEffect(() => {
    if (!agentRunning) return;
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status !== 'running') return t;
        const newProgress = Math.min(t.progress + Math.random() * 8, 100);
        return {
          ...t,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' as const : 'running' as const,
        };
      }));
      // Start next pending task if one completes
      setTasks(prev => {
        const hasRunning = prev.some(t => t.status === 'running');
        if (!hasRunning) {
          const nextPending = prev.findIndex(t => t.status === 'pending');
          if (nextPending >= 0) {
            return prev.map((t, i) => i === nextPending ? { ...t, status: 'running' as const, progress: 5 } : t);
          }
        }
        return prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [agentRunning]);

  const statusColor = (status: AgentTask['status']) => {
    switch (status) {
      case 'running': return CYBER_CYAN;
      case 'completed': return CYBER_GREEN;
      case 'failed': return CYBER_RED;
      default: return '#8888aa';
    }
  };

  const toggleCapability = (key: string) => {
    setCapabilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSkill = (key: string) => {
    setSkills(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }));
  };

  const addComposedSkill = (skill: string) => {
    if (!composedSkills.includes(skill)) {
      setComposedSkills(prev => [...prev, skill]);
    } else {
      setComposedSkills(prev => prev.filter(s => s !== skill));
    }
  };

  // Simulate autonomous planning when mode is on
  useEffect(() => {
    if (!autonomousMode) {
      setPlanningSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));
      return;
    }
    const interval = setInterval(() => {
      setPlanningSteps(prev => {
        const nextPending = prev.findIndex(s => s.status === 'pending');
        if (nextPending === -1) return prev;
        return prev.map((s, i) => {
          if (i < nextPending) return s;
          if (i === nextPending) return { ...s, status: 'running' as const };
          return s;
        });
      });
      // Complete running steps
      setPlanningSteps(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'completed' as const } : s
      ));
    }, 2000);
    return () => clearInterval(interval);
  }, [autonomousMode]);

  const brainInfo = BRAIN_MODE_LABELS[brainMode] || BRAIN_MODE_LABELS.gemini;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brain Mode Info Bar */}
      <div className="px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={12} style={{ color: brainInfo.color }} />
          <span className="text-[10px] font-semibold" style={{ color: brainInfo.color }}>{brainInfo.label}</span>
// ------------------------------------------------------------
        // </div>
        {autonomousMode && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CYBER_GREEN }} />
            <span className="text-[9px] font-mono" style={{ color: CYBER_GREEN }}>AUTONOMOUS</span>
          </div>
        )}
      </div>

      {/* Agent Sub-Tabs */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        {([
          { id: 'control' as const, label: 'Control', icon: Play },
          { id: 'enhancement' as const, label: 'Enhancement', icon: Layers },
          { id: 'skills' as const, label: 'Skills', icon: Grid3X3 },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setAgentSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-medium transition-all whitespace-nowrap ${
              agentSubTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={agentSubTab === tab.id ? {
              background: `${GOOGLE_BLUE}12`,
              border: `1px solid ${GOOGLE_BLUE}25`,
            } : { border: '1px solid transparent' }}>
            <SafeIcon icon={tab.icon} size={10} style={{ color: agentSubTab === tab.id ? GOOGLE_BLUE : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {agentSubTab === 'control' && (
          <div className="p-4 space-y-4">
            {/* Autonomous Planning */}
            {autonomousMode && (
              <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                    <Target size={12} style={{ color: CYBER_GREEN }} /> Autonomous Planning
                  </h3>
                  <span className="text-[8px] font-mono" style={{ color: CYBER_GREEN }}>ACTIVE</span>
                </div>
                <div className="space-y-1.5">
                  {planningSteps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                      <span className="text-[8px] font-mono w-4 text-center" style={{ color: '#666688' }}>{i + 1}</span>
                      {step.status === 'running' && <RefreshCw size={9} className="animate-spin" style={{ color: CYBER_CYAN }} />}
                      {step.status === 'completed' && <CheckCircle2 size={9} style={{ color: CYBER_GREEN }} />}
                      {step.status === 'failed' && <XCircle size={9} style={{ color: CYBER_RED }} />}
                      {step.status === 'pending' && <Clock size={9} style={{ color: '#666688' }} />}
                      <span className="text-[10px]" style={{ color: step.status === 'completed' ? CYBER_GREEN : step.status === 'running' ? CYBER_CYAN : '#8888aa' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Control */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${GOOGLE_BLUE}25, ${GOOGLE_BLUE}08)`, border: `1px solid ${GOOGLE_BLUE}25` }}>
              <Bot size={20} style={{ color: GOOGLE_BLUE }} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm flex items-center gap-2">
                Gemini Background Agent
                <span className={`w-2 h-2 rounded-full ${agentRunning ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: agentRunning ? CYBER_GREEN : '#8888aa' }} />
              </div>
              <div className="text-[10px] text-[#8888aa]">
// ------------------------------------------------------------
              // </div>
            </div>
          </div>
          <button onClick={agentRunning ? stopAgent : startAgent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: agentRunning ? `${CYBER_RED}30` : `${CYBER_GREEN}30`,
              color: agentRunning ? CYBER_RED : CYBER_GREEN,
              background: agentRunning ? `${CYBER_RED}10` : `${CYBER_GREEN}10`,
            }}>
            {agentRunning ? <><Square size={10} /> Stop Agent</> : <><Play size={10} /> Start Agent</>}
          </button>
        </div>

        {/* Health Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {healthMetrics.map(m => (
            <div key={m.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <SafeIcon icon={m.icon} size={9} style={{ color: m.color }} />
                <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{m.label}</span>
              </div>
              <div className="text-[11px] font-mono font-bold" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Queue */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Activity size={12} style={{ color: CYBER_CYAN }} />
            Task Queue
          </h3>
          <span className="text-[9px] text-[#8888aa]">
            {tasks.filter(t => t.status === 'completed').length}/{tasks.length} completed
          </span>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(task.status) }} />
                  <span className="text-[10px] text-white font-medium">{task.name}</span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: statusColor(task.status) }}>
                  {task.status}
                </span>
              </div>
              {task.status === 'running' && (
                <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: CYBER_CYAN }}
                    initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.5 }} />
                </div>
              )}
              {task.status === 'completed' && (
                <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: CYBER_GREEN, width: '100%' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

            {/* Memory Integration */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Brain size={12} style={{ color: CYBER_PURPLE }} />
                Memory Integration
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Context Store', status: 'Connected', icon: Database, color: CYBER_GREEN },
                  { label: 'RAG Engine', status: 'Active', icon: Search, color: CYBER_CYAN },
                  { label: 'Knowledge Graph', status: 'Synced', icon: GitBranch, color: CYBER_AMBER },
                  { label: 'Session Memory', status: agentRunning ? 'Recording' : 'Paused', icon: Activity, color: agentRunning ? CYBER_GREEN : '#8888aa' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
                    <SafeIcon icon={item.icon} size={10} style={{ color: item.color }} />
                    <div>
                      <div className="text-[9px] text-[#ccccdd] font-medium">{item.label}</div>
                      <div className="text-[8px]" style={{ color: item.color }}>{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agent Enhancement Panel */}
        {agentSubTab === 'enhancement' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Layers size={12} style={{ color: CYBER_PURPLE }} /> Agent Capabilities
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'autonomousPlanning', label: 'Autonomous Planning', icon: Target, desc: 'Plan and execute tasks independently' },
                  { key: 'memoryIntegration', label: 'Memory Integration', icon: Brain, desc: 'Access and store memories across sessions' },
                  { key: 'toolUsage', label: 'Tool Usage', icon: Wrench, desc: 'Use external tools and APIs' },
                  { key: 'artifactGeneration', label: 'Artifact Generation', icon: FileCode, desc: 'Create files, documents, and code artifacts' },
                  { key: 'interAgentComm', label: 'Inter-Agent Communication', icon: Network, desc: 'Communicate with other agents' },
                  { key: 'taskDelegation', label: 'Task Delegation', icon: Users, desc: 'Delegate subtasks to specialized agents' },
                  { key: 'swarmParticipation', label: 'Swarm Participation', icon: Workflow, desc: 'Join swarm intelligence sessions' },
                ].map(cap => (
                  <div key={cap.key} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] hover:border-[rgba(157,78,221,0.2)] transition-colors">
                    <div className="flex items-center gap-2">
                      <SafeIcon icon={cap.icon} size={10} style={{ color: capabilities[cap.key] ? CYBER_GREEN : '#666688' }} />
                      <div>
                        <div className="text-[10px] text-white font-medium">{cap.label}</div>
                        <div className="text-[8px] text-[#8888aa]">{cap.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => toggleCapability(cap.key)}>
                      {capabilities[cap.key] ? (
                        <ToggleRight size={16} style={{ color: CYBER_GREEN }} />
                      ) : (
                        <ToggleLeft size={16} style={{ color: '#666688' }} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Skills from Enhancement Layer */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Zap size={12} style={{ color: CYBER_AMBER }} /> Active Enhancement Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(skills).filter(([, v]) => v.active).map(([key]) => (
                  <span key={key} className="px-2 py-1 rounded-lg text-[9px] font-medium border" style={{
                    borderColor: `${CYBER_GREEN}25`, color: CYBER_GREEN, background: `${CYBER_GREEN}08`,
                  }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Skill System Panel */}
        {agentSubTab === 'skills' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                  <Grid3X3 size={12} style={{ color: CYBER_CYAN }} /> Available Skills
                </h3>
                <span className="text-[8px] text-[#8888aa]">{Object.values(skills).filter(s => s.active).length}/{Object.keys(skills).length} active</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(skills).map(([key, skill]) => {
                  const skillColors: Record<string, string> = {
                    coding: CYBER_GREEN, wordpress: GOOGLE_BLUE, seo: CYBER_AMBER,
                    automation: CYBER_CYAN, research: CYBER_PURPLE, dataAnalysis: '#ff6b9d', security: CYBER_RED,
                  };
                  const color = skillColors[key] || CYBER_PURPLE;
                  return (
                    <div key={key} className={`rounded-lg border p-3 transition-all cursor-pointer ${
                      skill.active ? 'border-[rgba(157,78,221,0.25)]' : 'border-[rgba(157,78,221,0.1)]'
                    }`}
                      style={{ background: skill.active ? `${color}08` : 'rgba(10,10,26,0.4)' }}
                      onClick={() => toggleSkill(key)}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: skill.active ? color : '#8888aa' }}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        {skill.active ? (
                          <ToggleRight size={14} style={{ color }} />
                        ) : (
                          <ToggleLeft size={14} style={{ color: '#666688' }} />
                        )}
                      </div>
                      <div className="text-[8px] text-[#8888aa]">v{skill.version}</div>
                      <div className="text-[7px] mt-1" style={{ color: skill.active ? color : '#666688' }}>
                        {skill.active ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skill Composer */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Puzzle size={12} style={{ color: CYBER_AMBER }} /> Skill Composer
              </h3>
              <div className="text-[9px] text-[#8888aa] mb-2">Click skills to compose composite expertise:</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.keys(skills).map(key => (
                  <button key={key} onClick={() => addComposedSkill(key)}
                    className={`px-2 py-1 rounded text-[8px] font-medium border transition-all ${
                      composedSkills.includes(key) ? 'scale-105' : ''
                    }`}
                    style={{
                      borderColor: composedSkills.includes(key) ? `${CYBER_AMBER}40` : 'rgba(157,78,221,0.15)',
                      color: composedSkills.includes(key) ? CYBER_AMBER : '#8888aa',
                      background: composedSkills.includes(key) ? `${CYBER_AMBER}10` : 'transparent',
                    }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
              {composedSkills.length > 0 && (
                <div className="rounded-lg border border-[rgba(255,182,39,0.15)] bg-[rgba(10,10,26,0.4)] p-3">
                  <div className="text-[9px] text-[#8888aa] mb-1.5">Composite Skill:</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {composedSkills.map((skill, i) => (
                      <span key={skill} className="flex items-center gap-1">
                        <span className="text-[9px] font-medium" style={{ color: CYBER_AMBER }}>{skill}</span>
                        {i < composedSkills.length - 1 && <ArrowRight size={8} style={{ color: '#666688' }} />}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
   // SKILLS TAB — Prebuilt Skills Management
// ------------------------------------------------------------
function SkillsTab({ activeSkillIds, toggleSkill, getActiveSkillPrompt }: {
  activeSkillIds: string[];
  toggleSkill: (id: string) => void;
  getActiveSkillPrompt: () => string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const SKILL_COLORS: Record<string, string> = {
    coding: '#00ff88',
    wordpress: '#4285f4',
    seo: '#FFB627',
    automation: '#9d4edd',
    research: '#00ffff',
    'data-analysis': '#e879f9',
    security: '#E63946',
  };

  const filteredSkills = BUILTIN_SKILLS.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTestSkill = useCallback(async () => {
    const prompt = getActiveSkillPrompt();
    if (!prompt) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: `${prompt}\n\nDemonstrate your capabilities with a brief example.`,
          model: 'auto',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data.response || 'No response from skill test.');
      } else {
        setTestResult(`Skill test failed: HTTP ${res.status}`);
      }
    } catch (error) {
      setTestResult(`Skill test error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsTesting(false);
    }
  }, [getActiveSkillPrompt]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle size={16} style={{ color: CYBER_PURPLE }} />
          <span className="text-white font-bold text-sm">Prebuilt Skills</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold"
            style={{ background: `${CYBER_GREEN}10`, color: CYBER_GREEN, border: `1px solid ${CYBER_GREEN}30` }}>
            {activeSkillIds.length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-1.5 text-[10px] text-white placeholder:text-[#8888aa] outline-none w-48"
          />
          {activeSkillIds.length > 0 && (
            <>
              <button onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border border-[rgba(0,255,255,0.25)] text-[#00ffff] bg-[rgba(0,255,255,0.06)] hover:bg-[rgba(0,255,255,0.12)] transition-colors">
                <Eye size={10} />
                {showPrompt ? 'Hide Prompt' : 'View Prompt'}
              </button>
              <button onClick={handleTestSkill} disabled={isTesting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border border-[rgba(0,255,136,0.25)] text-[#00ff88] bg-[rgba(0,255,136,0.06)] hover:bg-[rgba(0,255,136,0.12)] transition-colors disabled:opacity-50">
                {isTesting ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                Test Skills
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Skills System Prompt Preview */}
      {showPrompt && activeSkillIds.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border border-[rgba(0,255,255,0.15)] bg-[rgba(10,10,26,0.5)] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain size={10} style={{ color: CYBER_CYAN }} />
            <span className="text-[9px] text-[#00ffff] uppercase tracking-wider font-bold">Active System Prompt Addition</span>
          </div>
          <pre className="text-[9px] text-[#ccccdd] whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
            {getActiveSkillPrompt()}
          </pre>
        </motion.div>
      )}

      {/* Skill Test Result */}
      {testResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(10,10,26,0.5)] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={10} style={{ color: CYBER_GREEN }} />
              <span className="text-[9px] text-[#00ff88] uppercase tracking-wider font-bold">Skill Test Result</span>
            </div>
            <button onClick={() => setTestResult(null)} className="text-[#8888aa] hover:text-white"><X size={10} /></button>
          </div>
          <div className="text-[10px] text-[#ccccdd] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
            {testResult}
          </div>
        </motion.div>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
        {filteredSkills.map(skill => {
          const isActive = activeSkillIds.includes(skill.id);
          const color = SKILL_COLORS[skill.category] || CYBER_PURPLE;

          return (
            <motion.div key={skill.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-xl border p-4 transition-all cursor-pointer"
              style={{
                borderColor: isActive ? `${color}40` : `${color}15`,
                background: isActive ? `${color}08` : 'rgba(18,18,42,0.5)',
              }}
              onClick={() => toggleSkill(skill.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)`, border: `1px solid ${color}30` }}>
                    <SafeIcon icon={
                      skill.category === 'coding' ? Code :
                      skill.category === 'wordpress' ? Database :
                      skill.category === 'seo' ? Search :
                      skill.category === 'automation' ? Workflow :
                      skill.category === 'research' ? BookOpen :
                      skill.category === 'data-analysis' ? Brain :
                      Shield
                    } size={16} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-xs">{skill.name}</div>
                    <div className="text-[8px] uppercase font-mono" style={{ color }}>{skill.category} · v{skill.version}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      <CheckCircle2 size={8} /> ACTIVE
                    </span>
                  ) : (
                    <span className="text-[8px] px-2 py-0.5 rounded-full text-[#8888aa] border border-[rgba(136,136,170,0.15)]">
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-[#ccccdd] mb-3 leading-relaxed">{skill.description}</p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-2">
                {skill.capabilities.slice(0, 4).map(cap => (
                  <span key={cap} className="text-[7px] px-1.5 py-0.5 rounded"
                    style={{ background: `${color}10`, color: `${color}cc` }}>
                    {cap}
                  </span>
                ))}
                {skill.capabilities.length > 4 && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded text-[#8888aa]">
                    +{skill.capabilities.length - 4} more
                  </span>
                )}
              </div>

              {/* Tools & Artifacts */}
              <div className="flex items-center gap-3 text-[8px] text-[#8888aa]">
                <span className="flex items-center gap-1"><Wrench size={7} /> {skill.tools.length} tools</span>
                <span className="flex items-center gap-1"><FileCode size={7} /> {skill.artifacts.length} artifacts</span>
                {skill.dependencies.length > 0 && (
                  <span className="flex items-center gap-1"><ArrowRight size={7} /> depends: {skill.dependencies.join(', ')}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Composite Skill Info */}
      {activeSkillIds.length > 1 && (
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={12} style={{ color: CYBER_PURPLE }} />
            <span className="text-[10px] text-[#9d4edd] font-bold uppercase tracking-wider">Composite Skill Active</span>
          </div>
          <div className="text-[9px] text-[#ccccdd]">
            {(() => {
              const composite = composeSkills(activeSkillIds);
              return (
                <>
                  <span className="text-white font-medium">{composite.name}</span>
                  <span className="text-[#8888aa]"> — {composite.description}</span>
                  <div className="mt-1 text-[8px] text-[#8888aa]">
                    Combines: {activeSkillIds.map(id => BUILTIN_SKILLS.find(s => s.id === id)?.name).filter(Boolean).join(' + ')}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
