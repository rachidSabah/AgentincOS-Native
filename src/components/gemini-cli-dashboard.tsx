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
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// â”€â”€â”€ Color Constants â”€â”€â”€
const GOOGLE_BLUE = '#4285f4';
const CYBER_GREEN = '#00ff88';
const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_PURPLE = '#9d4edd';

// â”€â”€â”€ Types â”€â”€â”€
type TabId = 'chat' | 'code' | 'terminal' | 'files' | 'agent';
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GEMINI CLI DASHBOARD â€” Main Export
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function GeminiCLIDashboard() {
  const { geminiCLI, updateGeminiCLI, geminiConnection, providers, activeProviderId } = useOSStore();
  const activeProvider = activeProviderId ? providers.find(p => p.id === activeProviderId && p.enabled) : null;
  const isUsingNonGeminiProvider = activeProvider && activeProvider.type !== 'cli' && !activeProvider.id?.includes('gemini');
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [brainMode, setBrainMode] = useState('gemini');
  const [autonomousMode, setAutonomousMode] = useState(false);

  const isRunning = geminiCLI.running || geminiConnection.running || geminiCLI.installed || geminiConnection.installed;
  const isInstalled = geminiCLI.installed || geminiConnection.installed;

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

  // Auto-set activeProviderId if null but providers are enabled
  useEffect(() => {
    if (!activeProviderId) {
      const enabled = providers.find(p => p.enabled && p.type !== 'cli');
      if (enabled && useOSStore.getState().setActiveProviderId) {
        useOSStore.getState().setActiveProviderId(enabled.id);
      }
    }
  }, []);

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

  useEffect(() => {
    detectGemini();
    const interval = setInterval(detectGemini, 60000);
    return () => clearInterval(interval);
  }, [detectGemini]);

  const tabs: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'agent', label: 'Agent', icon: Bot },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* â”€â”€â”€ Header Section â”€â”€â”€ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
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
              {geminiCLI.model && <span>Â· {geminiCLI.model}</span>}
              {geminiCLI.sandboxEnabled && <span className="text-[#00ff88]">Â· Sandbox</span>}
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
            {isUsingNonGeminiProvider && activeProvider?.models?.length ? (
              activeProvider.models.map((m: string, i: number) => (
                <option key={`${m}-${i}`} value={m}>{m}</option>
              ))
            ) : (
              <>
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
              </>
            )}
          </select>

          {/* Auto-detect */}
          <button onClick={detectGemini} disabled={isDetecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            {isDetecting ? <RefreshCw size={10} className="animate-spin" /> : <Radio size={10} />}
            Detect
          </button>

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

      {/* â”€â”€â”€ Tab Navigation â”€â”€â”€ */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(66,133,244,0.06)]'
            }`}
            style={activeTab === tab.id ? {
              background: `${GOOGLE_BLUE}15`,
              border: `1px solid ${GOOGLE_BLUE}30`,
            } : { border: '1px solid transparent' }}>
            <tab.icon size={12} style={{ color: activeTab === tab.id ? GOOGLE_BLUE : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* â”€â”€â”€ Tab Content â”€â”€â”€ */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
            {activeTab === 'chat' && <ChatTab isRunning={isRunning} model={geminiCLI.model} />}
            {activeTab === 'code' && <CodeTab isRunning={isRunning} model={geminiCLI.model} />}
            {activeTab === 'terminal' && <TerminalTab isRunning={isRunning} />}
            {activeTab === 'files' && <FilesTab isRunning={isRunning} />}
            {activeTab === 'agent' && <AgentTab isRunning={isRunning} brainMode={brainMode} autonomousMode={autonomousMode} setAutonomousMode={setAutonomousMode} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHAT TAB
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function ChatTab({ isRunning, model }: { isRunning: boolean; model: string }) {
  const { addChatMessage, chatHistories, addLog, providers, activeProviderId } = useOSStore();
  const messages = (chatHistories['gemini-cli-dashboard'] || []) as GeminiChatMsg[];
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const activeProvider = providers.find(p => p.id === activeProviderId && p.enabled) || null;
  const coworkerModels = teamMode ? (activeProvider?.models || []).filter((m: string) => m !== model && m !== 'auto').slice(0, 3) : [];
  const [coworkerResults, setCoworkerResults] = useState<{ model: string; response: string }[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; content: string } | null>(null);
  const [artifacts, setArtifacts] = useState<{ language: string; code: string }[]>([]);
  const [showObsidian, setShowObsidian] = useState(false);

  const extractArtifacts = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const newArtifacts: { language: string; code: string }[] = [];
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      newArtifacts.push({ language: match[1] || 'text', code: match[2].trim() });
    }
    if (newArtifacts.length > 0) setArtifacts(prev => [...prev, ...newArtifacts]);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setAttachmentPreview({ name: file.name, content: text.slice(0, 8000) });
    } catch {
      setAttachmentPreview({ name: file.name, content: `[Binary: ${file.name}]` });
    }
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
    if ((!text.trim() && !attachmentPreview) || isLoading) return;

    let fullContent = text.trim();
    let displayContent = text.trim();
    if (attachmentPreview) {
      fullContent = attachmentPreview.content.includes('[Binary')
        ? `${text}\n\n[File: ${attachmentPreview.name}]`
        : `${text ? text + '\n\n' : ''}File "${attachmentPreview.name}":\n\`\`\`\n${attachmentPreview.content}\n\`\`\``;
      displayContent = attachmentPreview.name;
    }

    const userMsg: GeminiChatMsg = {
      id: `cli-chat-u-${Date.now()}`,
      role: 'user',
      content: displayContent || fullContent,
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
      // Direct Gemini CLI — proven reliable path
      let res = await fetch('/api/hermes/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: fullContent, model }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const agentContent = data.response || 'No response received.';

      const modelInfo = data.modelsUsed?.length ? ` [${data.modelsUsed.join(', ')}]` : '';
      addChatMessage('gemini-cli-dashboard', {
        id: `cli-chat-a-${Date.now()}`,
        role: 'agent',
        content: agentContent,
        timestamp: Date.now(),
        agentId: 'gemini',
      });
      extractArtifacts(agentContent);
      setAttachmentPreview(null);

      // Team Mode: run coworker models in parallel for consensus
      if (teamMode && coworkerModels.length > 0) {
        setCoworkerResults([]);
        const coworkerPromises = coworkerModels.map(async (cm: string) => {
          try {
            const cmRes = await fetch('/api/ai', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'chat', message: `Review and refine this response for the task "${fullContent.slice(0, 100)}...". Provide your perspective:\n\n${agentContent.slice(0, 2000)}`, provider: activeProvider?.name, apiKey: activeProvider?.apiKey, baseUrl: activeProvider?.apiEndpoint, model: cm }),
            });
            if (cmRes.ok) {
              const cmData = await cmRes.json();
              return { model: cm, response: cmData.response || '' };
            }
          } catch {}
          return { model: cm, response: '' };
        });
        const results = await Promise.all(coworkerPromises);
        const validResults = results.filter(r => r.response);
        if (validResults.length > 0) {
          setCoworkerResults(validResults);
          const combinedFeedback = validResults.map(r => `**${r.model}**: ${r.response.slice(0, 200)}`).join('\n\n');
          addChatMessage('gemini-cli-dashboard', {
            id: `cli-chat-team-${Date.now()}`,
            role: 'agent',
            content: `Team Review (${validResults.length} coworkers):\n\n${combinedFeedback}`,
            timestamp: Date.now(),
            agentId: 'gemini-team',
          });
        }
      }
    } catch (err: any) {
      const errMsg = `Chat failed: ${err?.message || 'Unknown error'}. Try refreshing or check Settings > Providers.`;
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
                AI SDK active â€” Connect Gemini CLI for direct CLI features
              </div>
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
                <div className="text-[11px] text-[#ccccdd] whitespace-pre-wrap">{streamingText}<span className="animate-pulse">â–Œ</span></div>
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

      {/* Team Mode Toggle */}
      {activeProvider && activeProvider.models?.length > 1 && (
        <div className="px-4 py-1.5 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-2 bg-[rgba(157,78,221,0.03)]">
          <button onClick={() => setTeamMode(!teamMode)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-bold transition-colors ${teamMode ? 'bg-[rgba(157,78,221,0.15)] text-[#9d4edd] border border-[rgba(157,78,221,0.3)]' : 'text-[#8888aa] border border-[rgba(157,78,221,0.1)] hover:text-white'}`}>
            {teamMode ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
            Team Mode {teamMode && `(+${coworkerModels.length} coworkers)`}
          </button>
          {coworkerResults.length > 0 && (
            <span className="text-[7px] text-[#00ff88] ml-auto">{coworkerResults.length} reviews done</span>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {quickActions.map(action => (
            <button key={action.label} onClick={() => setInput(action.prompt)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{ borderColor: `${GOOGLE_BLUE}20`, color: GOOGLE_BLUE, background: `${GOOGLE_BLUE}08` }}>
              <action.icon size={9} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attachment Preview */}
      {attachmentPreview && (
        <div className="px-4 py-1.5 border-t border-[rgba(66,133,244,0.1)] bg-[rgba(66,133,244,0.03)] flex items-center gap-2">
          <Paperclip size={10} style={{ color: GOOGLE_BLUE }} />
          <span className="text-[10px] text-[#ccccdd] font-mono truncate">{attachmentPreview.name}</span>
          <button onClick={() => setAttachmentPreview(null)} className="ml-auto text-[8px] text-[#8888aa] hover:text-white">Remove</button>
        </div>
      )}

      {/* Artifact Panel */}
      {artifacts.length > 0 && (
        <div className="border-t border-[rgba(0,255,136,0.1)] bg-[rgba(0,255,136,0.02)]">
          <div className="flex items-center gap-2 px-4 py-1.5">
            <FileCode size={10} style={{ color: '#00ff88' }} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00ff88]">Generated Artifacts ({artifacts.length})</span>
            <button onClick={() => setArtifacts([])} className="ml-auto text-[8px] text-[#8888aa] hover:text-white">Clear</button>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar px-4 pb-2 space-y-1">
            {artifacts.map((a, i) => (
              <div key={i} className="bg-[rgba(10,10,26,0.5)] border border-[rgba(0,255,136,0.1)] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-2 py-0.5 border-b border-[rgba(0,255,136,0.05)]">
                  <span className="text-[8px] text-[#00ff88] font-mono uppercase">{a.language}</span>
                  <button onClick={() => navigator.clipboard.writeText(a.code)} className="text-[7px] text-[#8888aa] hover:text-white">Copy</button>
                </div>
                <pre className="p-1.5 text-[8px] text-[#ccccdd] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">{a.code.slice(0, 300)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept=".txt,.md,.json,.js,.ts,.py,.css,.csv,.log,.xml,.html" />
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CODE TAB
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function CodeTab({ isRunning, model }: { isRunning: boolean; model: string }) {
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
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: prompts[action], model }),
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
              <action.icon size={10} />
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TERMINAL TAB
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
            <cmd.icon size={8} />
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-[#0a0a1a] font-mono text-[11px] custom-scrollbar">
        {output.length === 0 && (
          <div className="text-[#8888aa] text-[10px]">
            <div className="mb-1" style={{ color: CYBER_CYAN }}>Gemini CLI Terminal</div>
            <div>Shell: {shellType} Â· Type commands and press Enter to execute</div>
            <div className="mt-2 text-[#666688]">Tip: Use â†‘/â†“ to navigate command history</div>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FILES TAB
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function FilesTab({ isRunning }: { isRunning: boolean }) {
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
        setFileContent(`// File: ${path}\n// Content not available â€” connect Gemini CLI for file access`);
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
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Analyze the file ${selectedFile} and provide insights about its structure, purpose, and potential improvements.` }),
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AGENT TAB
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
// â”€â”€â”€ Brain Mode Labels â”€â”€â”€
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

  // Execute a task through Gemini CLI
  const executeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'running') return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'running' as const, progress: 10 } : t));
    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `You are a ${task.name} agent. Execute this task: ${task.name}. Be thorough and provide actionable output.`, model: geminiCLI.model || 'gemini-2.5-flash-lite' }),
      });
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const, progress: 100, output: data.response?.slice(0, 300) } : t));
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' as const, progress: 0 } : t));
    }
  };

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
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Brain Mode Info Bar */}
      <div className="px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={12} style={{ color: brainInfo.color }} />
          <span className="text-[10px] font-semibold" style={{ color: brainInfo.color }}>{brainInfo.label}</span>
          <span className="text-[9px] text-[#8888aa]">â€” {brainInfo.role}</span>
        </div>
        {autonomousMode && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CYBER_GREEN }} />
            <span className="text-[9px] font-mono" style={{ color: CYBER_GREEN }}>AUTONOMOUS</span>
          </div>
        )}
      </div>

      {/* Prebuilt Agents + Background Agent */}
      <div className="px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(0,255,136,0.02)] flex items-center gap-2 overflow-x-auto">
        <span className="text-[8px] text-[#8888aa] uppercase tracking-wider flex-shrink-0">Agents:</span>
        {['Code Reviewer', 'Doc Writer', 'Security Scanner', 'Researcher'].map(name => (
          <button key={name} onClick={() => {
            setAgentRunning(!agentRunning);
            setTasks(prev => [...prev, { id: `t-${Date.now()}`, name, status: 'pending', progress: 0, startedAt: Date.now() }]);
          }} className="text-[8px] px-2 py-1 rounded border border-[rgba(0,255,136,0.15)] text-[#ccccdd] hover:border-[rgba(0,255,136,0.3)] hover:text-white transition-colors whitespace-nowrap flex-shrink-0">
            {name}
          </button>
        ))}
        <div className="w-px h-4 bg-[rgba(157,78,221,0.15)] flex-shrink-0" />
        <button onClick={() => setAgentRunning(!agentRunning)}
          className={`flex items-center gap-1 text-[8px] px-2 py-1 rounded border transition-colors whitespace-nowrap flex-shrink-0 ${agentRunning ? 'bg-[rgba(0,255,136,0.1)] border-[rgba(0,255,136,0.3)] text-[#00ff88]' : 'border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${agentRunning ? 'animate-pulse bg-[#00ff88]' : 'bg-[#8888aa]'}`} />
          {agentRunning ? 'Background Agent ON' : 'Background Agent OFF'}
        </button>
        {agentRunning && <span className="text-[7px] text-[#00ff88] flex-shrink-0">Running...</span>}
      </div>

      {/* Agent Sub-
      {/* Live Orchestration Panel */}
      <div className="px-4 py-1.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(255,182,39,0.03)] flex items-center gap-2 text-[8px]">
        <span className="text-[#FFB627] font-bold uppercase tracking-wider">Orch:</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> CLI Lead</span>
        {isUsingNonGeminiProvider && <span className="text-[#8888aa]">+ Worker</span>}
        <span className="text-[#8888aa] ml-auto">Multi-Model Active</span>
      </div>

      {/* Tabs */}
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
            <tab.icon size={10} style={{ color: agentSubTab === tab.id ? GOOGLE_BLUE : '#8888aa' }} />
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
                {agentRunning ? 'Running and processing tasks' : 'Stopped â€” click Start to begin'}
              </div>
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
                <m.icon size={9} style={{ color: m.color }} />
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
                {task.status === 'pending' && (
                  <button onClick={() => executeTask(task.id)} className="text-[8px] px-2 py-0.5 rounded bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]">Run</button>
                )}
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
                    <item.icon size={10} style={{ color: item.color }} />
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
                      <cap.icon size={10} style={{ color: capabilities[cap.key] ? CYBER_GREEN : '#666688' }} />
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
