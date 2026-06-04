'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal as TerminalIcon, Plus, X, ChevronDown, Play,
  Search, Star, Copy, RefreshCw, SplitSquareHorizontal,
  Sparkles, AlertCircle, Shield, Lightbulb, Wrench,
  History, ArrowUp, ArrowDown, Command, Globe,
  Zap, BookOpen, Settings, CheckCircle2, Clock,
  Brain, MessageSquare, ToggleLeft, ToggleRight,
  ArrowRight, ListChecks, RotateCcw, Eye,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Color Constants ───
const CYBER_GREEN = '#00ff88';
const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_PURPLE = '#9d4edd';
const GOOGLE_BLUE = '#4285f4';

// ─── Types ───
type ShellType = 'bash' | 'powershell' | 'cmd' | 'git-bash' | 'wsl' | 'custom';

interface TerminalTab {
  id: string;
  name: string;
  shell: ShellType;
  history: TerminalLine[];
  commandHistory: string[];
  isRunning: boolean;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: number;
}

interface SavedCommand {
  id: string;
  label: string;
  command: string;
  icon?: string;
}

/* ═══════════════════════════════════════════════════════════
   TERMINAL CENTER — Main Export
   ═══════════════════════════════════════════════════════════ */
export function TerminalCenter() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'term-1', name: 'Terminal 1', shell: 'bash', history: [], commandHistory: [], isRunning: false },
  ]);
  const [activeTabId, setActiveTabId] = useState('term-1');
  const [splitView, setSplitView] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [safeExecute, setSafeExecute] = useState(false);
  const [contextAware, setContextAware] = useState(true);
  const [nlInput, setNlInput] = useState('');
  const [generatedCommand, setGeneratedCommand] = useState<string | null>(null);
  const [isGeneratingCmd, setIsGeneratingCmd] = useState(false);
  const [showNLInput, setShowNLInput] = useState(false);
  const [multiStepPlan, setMultiStepPlan] = useState<Array<{ id: string; command: string; status: 'pending' | 'running' | 'completed' | 'failed' }> | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = () => {
    const newId = `term-${Date.now()}`;
    const shellNames: ShellType[] = ['bash', 'powershell', 'cmd'];
    setTabs(prev => [...prev, {
      id: newId,
      name: `Terminal ${prev.length + 1}`,
      shell: shellNames[prev.length % shellNames.length],
      history: [],
      commandHistory: [],
      isRunning: false,
    }]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      setActiveTabId(remaining[0]?.id || '');
    }
  };

  const updateTab = (id: string, updates: Partial<TerminalTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap group ${
                activeTabId === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-[#ccccdd]'
              }`}
              style={activeTabId === tab.id ? {
                background: `${CYBER_CYAN}12`,
                border: `1px solid ${CYBER_CYAN}25`,
              } : { border: '1px solid transparent' }}>
              <TerminalIcon size={10} style={{ color: activeTabId === tab.id ? CYBER_CYAN : '#8888aa' }} />
              {tab.name}
              {tabs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-[#ff4444] transition-all">
                  <X size={8} />
                </button>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={addTab}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-[rgba(157,78,221,0.15)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors"
            title="New terminal tab">
            <Plus size={12} />
          </button>
          <button onClick={() => setSplitView(!splitView)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              splitView ? 'border-[rgba(0,255,255,0.3)] text-[#00ffff]' : 'border-[rgba(157,78,221,0.15)] text-[#8888aa] hover:text-white'
            }`}
            title="Split view">
            <SplitSquareHorizontal size={12} />
          </button>
          <button onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              showAIPanel ? 'border-[rgba(66,133,244,0.3)] text-[#4285f4]' : 'border-[rgba(157,78,221,0.15)] text-[#8888aa] hover:text-white'
            }`}
            title="AI Assistant">
            <Sparkles size={12} />
          </button>
          <button onClick={() => setShowNLInput(!showNLInput)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              showNLInput ? 'border-[rgba(0,255,136,0.3)] text-[#00ff88]' : 'border-[rgba(157,78,221,0.15)] text-[#8888aa] hover:text-white'
            }`}
            title="Natural Language">
            <MessageSquare size={12} />
          </button>
        </div>
      </div>

      {/* ─── Terminal Content ─── */}
      <div className={`flex-1 flex ${splitView ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* Main Terminal */}
        <div className={`${splitView ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <TerminalInstance tab={activeTab} onUpdateTab={(updates) => updateTab(activeTab.id, updates)} showAIPanel={showAIPanel} safeExecute={safeExecute} contextAware={contextAware} nlInput={nlInput} setNlInput={setNlInput} generatedCommand={generatedCommand} setGeneratedCommand={setGeneratedCommand} isGeneratingCmd={isGeneratingCmd} setIsGeneratingCmd={setIsGeneratingCmd} showNLInput={showNLInput} multiStepPlan={multiStepPlan} setMultiStepPlan={setMultiStepPlan} isPlanning={isPlanning} setIsPlanning={setIsPlanning} />
        </div>

        {/* Split Terminal */}
        {splitView && (
          <>
            <div className="w-px bg-[rgba(157,78,221,0.1)]" />
            <div className="w-1/2 flex flex-col">
              <TerminalInstance
                tab={tabs.find(t => t.id !== activeTabId) || tabs[0]}
                onUpdateTab={(updates) => updateTab(tabs.find(t => t.id !== activeTabId)?.id || tabs[0].id, updates)}
                showAIPanel={false} safeExecute={safeExecute} contextAware={contextAware} nlInput={nlInput} setNlInput={setNlInput} generatedCommand={generatedCommand} setGeneratedCommand={setGeneratedCommand} isGeneratingCmd={isGeneratingCmd} setIsGeneratingCmd={setIsGeneratingCmd} showNLInput={showNLInput} multiStepPlan={multiStepPlan} setMultiStepPlan={setMultiStepPlan} isPlanning={isPlanning} setIsPlanning={setIsPlanning}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TERMINAL INSTANCE
   ═══════════════════════════════════════════════════════════ */
function TerminalInstance({ tab, onUpdateTab, showAIPanel, safeExecute, contextAware, nlInput, setNlInput, generatedCommand, setGeneratedCommand, isGeneratingCmd, setIsGeneratingCmd, showNLInput, multiStepPlan, setMultiStepPlan, isPlanning, setIsPlanning }: {
  tab: TerminalTab;
  onUpdateTab: (updates: Partial<TerminalTab>) => void;
  showAIPanel: boolean;
  safeExecute: boolean;
  contextAware: boolean;
  nlInput: string;
  setNlInput: (v: string) => void;
  generatedCommand: string | null;
  setGeneratedCommand: (v: string | null) => void;
  isGeneratingCmd: boolean;
  setIsGeneratingCmd: (v: boolean) => void;
  showNLInput: boolean;
  multiStepPlan: Array<{ id: string; command: string; status: 'pending' | 'running' | 'completed' | 'failed' }> | null;
  setMultiStepPlan: (v: Array<{ id: string; command: string; status: 'pending' | 'running' | 'completed' | 'failed' }> | null) => void;
  isPlanning: boolean;
  setIsPlanning: (v: boolean) => void;
}) {
  const { addLog } = useOSStore();
  const [command, setCommand] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shellOptions: { id: ShellType; label: string }[] = [
    { id: 'bash', label: 'Bash' },
    { id: 'powershell', label: 'PowerShell' },
    { id: 'cmd', label: 'CMD' },
    { id: 'git-bash', label: 'Git Bash' },
    { id: 'wsl', label: 'WSL' },
    { id: 'custom', label: 'Custom' },
  ];

  const savedCommands: SavedCommand[] = [
    { id: 's1', label: 'Install Deps', command: 'npm install', icon: '📦' },
    { id: 's2', label: 'Dev Server', command: 'bun run dev', icon: '⚡' },
    { id: 's3', label: 'Git Status', command: 'git status', icon: '🌿' },
    { id: 's4', label: 'Build', command: 'bun run build', icon: '🔨' },
    { id: 's5', label: 'Lint Check', command: 'bun run lint', icon: '✨' },
    { id: 's6', label: 'Test All', command: 'bun test', icon: '🧪' },
  ];

  const executeCommand = useCallback(async (cmd?: string) => {
    let cmdText = cmd || command;
    if (!cmdText.trim() || tab.isRunning) return;

    // Safe execute: run through safety check
    if (safeExecute && !cmd) {
      const safetyLine: TerminalLine = {
        id: `line-${Date.now()}-safe`,
        type: 'system',
        text: `🛡️ Safety check for: ${cmdText}`,
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, safetyLine] });

      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'execute', message: `Analyze this shell command for safety risks. Respond ONLY with 'SAFE' or 'UNSAFE: reason': ${cmdText}` }),
        });
        const data = await res.json();
        const result = data.response || '';
        if (result.toUpperCase().includes('UNSAFE')) {
          const unsafeLine: TerminalLine = {
            id: `line-${Date.now()}-unsafe`,
            type: 'error',
            text: `⛔ Command blocked: ${result}`,
            timestamp: Date.now(),
          };
          onUpdateTab({ history: [...tab.history, safetyLine, unsafeLine], isRunning: false });
          return;
        }
        const safeLine: TerminalLine = {
          id: `line-${Date.now()}-safeok`,
          type: 'system',
          text: '✅ Command passed safety check',
          timestamp: Date.now(),
        };
        onUpdateTab({ history: [...tab.history, safetyLine, safeLine] });
      } catch {
        // If safety check fails, proceed anyway
      }
    }

    // Check for multi-step command
    if (cmdText.includes(' && ') || cmdText.includes(' | ') || cmdText.includes('; ')) {
      const steps = cmdText.split(/&&|;|\|/).map(s => s.trim()).filter(Boolean);
      if (steps.length > 2 && !cmd) {
        setMultiStepPlan(steps.map((step, i) => ({
          id: `step-${i}`,
          command: step,
          status: 'pending' as const,
        })));
        // Still execute normally, just show the plan
      }
    }

    const newLine: TerminalLine = {
      id: `line-${Date.now()}`,
      type: 'input',
      text: cmdText,
      timestamp: Date.now(),
    };

    onUpdateTab({
      history: [...tab.history, newLine],
      commandHistory: [cmdText, ...tab.commandHistory].slice(0, 100),
      isRunning: true,
    });
    setCommand('');
    setHistoryIdx(-1);

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', command: cmdText, shell: tab.shell }),
      });
      const data = await res.json();
      const outputLine: TerminalLine = {
        id: `line-${Date.now()}-out`,
        type: data.exitCode === 0 ? 'output' : 'error',
        text: data.output || data.error || 'Command completed.',
        timestamp: Date.now(),
      };
      onUpdateTab({
        history: [...tab.history, newLine, outputLine],
        isRunning: false,
      });
    } catch {
      const errorLine: TerminalLine = {
        id: `line-${Date.now()}-err`,
        type: 'error',
        text: 'Failed to execute command. Terminal service unavailable.',
        timestamp: Date.now(),
      };
      onUpdateTab({
        history: [...tab.history, newLine, errorLine],
        isRunning: false,
      });
      addLog({
        id: `term-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Terminal',
        layer: 5,
        level: 'error',
        message: `Command failed: ${cmdText}`,
      });
    }
  }, [command, tab, onUpdateTab, addLog, safeExecute, setMultiStepPlan]);

  // AI-Assisted features
  const explainCommand = useCallback(async () => {
    if (!command.trim()) return;
    const explainLine: TerminalLine = {
      id: `line-${Date.now()}-sys`,
      type: 'system',
      text: `🤖 Explaining: ${command}`,
      timestamp: Date.now(),
    };
    onUpdateTab({ history: [...tab.history, explainLine] });

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Explain this terminal command in detail, including what each flag/argument does: ${command}` }),
      });
      const data = await res.json();
      const resultLine: TerminalLine = {
        id: `line-${Date.now()}-explain`,
        type: 'output',
        text: `💡 ${data.response || 'Explanation not available.'}`,
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, explainLine, resultLine] });
    } catch {
      const errLine: TerminalLine = {
        id: `line-${Date.now()}-err`,
        type: 'error',
        text: 'AI explanation failed. Gemini CLI not available.',
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, explainLine, errLine] });
    }
  }, [command, tab, onUpdateTab]);

  const generateCommand = useCallback(async (description: string) => {
    if (!description.trim()) return;
    const sysLine: TerminalLine = {
      id: `line-${Date.now()}-sys`,
      type: 'system',
      text: `🤖 Generating command for: ${description}`,
      timestamp: Date.now(),
    };
    onUpdateTab({ history: [...tab.history, sysLine] });

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Generate a ${tab.shell} command for: ${description}. Only output the command, nothing else.` }),
      });
      const data = await res.json();
      const generated = data.response?.trim() || '';
      if (generated) {
        setCommand(generated.replace(/^`|`$/g, ''));
        const resultLine: TerminalLine = {
          id: `line-${Date.now()}-gen`,
          type: 'output',
          text: `✨ Generated: ${generated}`,
          timestamp: Date.now(),
        };
        onUpdateTab({ history: [...tab.history, sysLine, resultLine] });
      }
    } catch {
      const errLine: TerminalLine = {
        id: `line-${Date.now()}-err`,
        type: 'error',
        text: 'AI command generation failed.',
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, sysLine, errLine] });
    }
  }, [tab, onUpdateTab]);

  const fixErrors = useCallback(async () => {
    const errorLines = tab.history.filter(l => l.type === 'error');
    if (errorLines.length === 0) return;
    const lastError = errorLines[errorLines.length - 1];

    const sysLine: TerminalLine = {
      id: `line-${Date.now()}-sys`,
      type: 'system',
      text: '🤖 Analyzing error for fix suggestions...',
      timestamp: Date.now(),
    };
    onUpdateTab({ history: [...tab.history, sysLine] });

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `I got this error in my ${tab.shell} terminal. Suggest how to fix it:\n\n${lastError.text}` }),
      });
      const data = await res.json();
      const fixLine: TerminalLine = {
        id: `line-${Date.now()}-fix`,
        type: 'output',
        text: `🔧 Fix suggestion: ${data.response || 'No suggestion available.'}`,
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, sysLine, fixLine] });
    } catch {
      const errLine: TerminalLine = {
        id: `line-${Date.now()}-err`,
        type: 'error',
        text: 'AI fix analysis failed.',
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, sysLine, errLine] });
    }
  }, [tab, onUpdateTab]);

  const securityAnalysis = useCallback(async () => {
    if (!command.trim()) return;
    const sysLine: TerminalLine = {
      id: `line-${Date.now()}-sys`,
      type: 'system',
      text: `🛡️ Analyzing security of: ${command}`,
      timestamp: Date.now(),
    };
    onUpdateTab({ history: [...tab.history, sysLine] });

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Analyze this command for potential security risks, dangerous operations, or unintended side effects: ${command}` }),
      });
      const data = await res.json();
      const secLine: TerminalLine = {
        id: `line-${Date.now()}-sec`,
        type: 'output',
        text: `🛡️ Security Analysis: ${data.response || 'Analysis not available.'}`,
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, sysLine, secLine] });
    } catch {
      const errLine: TerminalLine = {
        id: `line-${Date.now()}-err`,
        type: 'error',
        text: 'Security analysis failed.',
        timestamp: Date.now(),
      };
      onUpdateTab({ history: [...tab.history, sysLine, errLine] });
    }
  }, [command, tab, onUpdateTab]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, tab.commandHistory.length - 1);
      setHistoryIdx(newIdx);
      if (tab.commandHistory[newIdx]) setCommand(tab.commandHistory[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setCommand(newIdx === -1 ? '' : tab.commandHistory[newIdx] || '');
    }
  }, [executeCommand, tab.commandHistory, historyIdx]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tab.history]);

  const filteredHistory = searchQuery
    ? tab.history.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : tab.history;

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return CYBER_CYAN;
      case 'output': return CYBER_GREEN;
      case 'error': return CYBER_RED;
      case 'system': return CYBER_AMBER;
    }
  };

  const shellPrompt = () => {
    switch (tab.shell) {
      case 'powershell': return 'PS>';
      case 'cmd': return 'C:\\>';
      case 'git-bash': return 'git$';
      case 'wsl': return 'wsl$';
      default: return '$';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Shell Type & Controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        <div className="flex items-center gap-1">
          {shellOptions.map(shell => (
            <button key={shell.id} onClick={() => onUpdateTab({ shell: shell.id })}
              className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${
                tab.shell === shell.id ? 'text-white' : 'text-[#8888aa] hover:text-[#ccccdd]'
              }`}
              style={tab.shell === shell.id ? {
                background: `${CYBER_CYAN}12`,
                border: `1px solid ${CYBER_CYAN}25`,
              } : { border: '1px solid transparent' }}>
              {shell.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => setSearchOpen(!searchOpen)}
          className={`p-1 rounded transition-colors ${searchOpen ? 'text-[#00ffff]' : 'text-[#8888aa] hover:text-white'}`}>
          <Search size={11} />
        </button>
        <button onClick={() => setShowFavorites(!showFavorites)}
          className={`p-1 rounded transition-colors ${showFavorites ? 'text-[#FFB627]' : 'text-[#8888aa] hover:text-white'}`}>
          <Star size={11} />
        </button>
        <button onClick={() => setShowHistory(!showHistory)}
          className={`p-1 rounded transition-colors ${showHistory ? 'text-[#9d4edd]' : 'text-[#8888aa] hover:text-white'}`}>
          <History size={11} />
        </button>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[rgba(157,78,221,0.1)]">
            <div className="px-3 py-2 bg-[rgba(10,10,26,0.3)]">
              <div className="relative">
                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search terminal output..."
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,255,0.3)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites Panel */}
      <AnimatePresence>
        {showFavorites && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[rgba(157,78,221,0.1)]">
            <div className="px-3 py-2 bg-[rgba(10,10,26,0.3)]">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1.5">Saved Commands</div>
              <div className="flex flex-wrap gap-1">
                {savedCommands.map(cmd => (
                  <button key={cmd.id} onClick={() => { setCommand(cmd.command); setShowFavorites(false); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] border border-[rgba(255,182,39,0.2)] text-[#FFB627] bg-[rgba(255,182,39,0.05)] hover:bg-[rgba(255,182,39,0.1)] transition-colors">
                    <span>{cmd.icon}</span>
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[rgba(157,78,221,0.1)]">
            <div className="px-3 py-2 bg-[rgba(10,10,26,0.3)] max-h-32 overflow-y-auto custom-scrollbar">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1.5">Command History</div>
              {tab.commandHistory.length === 0 ? (
                <div className="text-[9px] text-[#666688]">No commands in history</div>
              ) : (
                <div className="space-y-0.5">
                  {tab.commandHistory.slice(0, 20).map((cmd, i) => (
                    <button key={i} onClick={() => { setCommand(cmd); setShowHistory(false); }}
                      className="w-full text-left flex items-center gap-2 px-2 py-0.5 rounded text-[9px] text-[#ccccdd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
                      <span className="text-[#8888aa] text-[8px] font-mono w-4">{i + 1}</span>
                      <span className="font-mono truncate">{cmd}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 bg-[#0a0a1a] font-mono text-[11px] custom-scrollbar"
        onClick={() => inputRef.current?.focus()}>
        {tab.history.length === 0 && (
          <div className="text-[#8888aa] text-[10px] leading-relaxed">
            <div className="mb-2" style={{ color: CYBER_CYAN }}>Agentic OS Terminal</div>
            <div>Shell: <span style={{ color: CYBER_GREEN }}>{tab.shell}</span></div>
            <div className="mt-2 text-[#666688]">
              <div>Quick tips:</div>
              <div className="ml-2">• Use ↑/↓ to navigate command history</div>
              <div className="ml-2">• Click ⭐ for saved commands</div>
              <div className="ml-2">• Click ✨ for AI-assisted features</div>
              <div className="ml-2">• Click 🔀 for split view</div>
            </div>
          </div>
        )}
        {filteredHistory.map(line => (
          <div key={line.id} className="mb-1 leading-relaxed" style={{ color: lineColor(line.type) }}>
            {line.type === 'input' && (
              <span className="text-[#8888aa] mr-1.5">{shellPrompt()}</span>
            )}
            {line.type === 'system' ? (
              <span className="opacity-80">{line.text}</span>
            ) : (
              <span className="whitespace-pre-wrap">{line.text}</span>
            )}
          </div>
        ))}
        {tab.isRunning && (
          <div className="flex items-center gap-2 mt-1" style={{ color: CYBER_AMBER }}>
            <RefreshCw size={9} className="animate-spin" />
            <span className="text-[10px]">Executing...</span>
          </div>
        )}
      </div>

      {/* AI-Assisted Panel */}
      {showAIPanel && (
        <div className="px-3 py-2 border-t border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.4)]">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider mr-1">AI:</span>
            <button onClick={explainCommand} disabled={!command.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] hover:bg-[rgba(66,133,244,0.1)] transition-colors disabled:opacity-30">
              <BookOpen size={8} /> Explain
            </button>
            <button onClick={() => { const desc = prompt('Describe what you want to do:'); if (desc) generateCommand(desc); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors">
              <Sparkles size={8} /> Generate
            </button>
            <button onClick={fixErrors}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
              <Wrench size={8} /> Fix Errors
            </button>
            <button onClick={() => { if (command.trim()) generateCommand(`Suggest improvements for: ${command}`); }}
              disabled={!command.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(255,182,39,0.2)] text-[#FFB627] hover:bg-[rgba(255,182,39,0.1)] transition-colors disabled:opacity-30">
              <Lightbulb size={8} /> Suggest
            </button>
            <button onClick={securityAnalysis} disabled={!command.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors disabled:opacity-30">
              <Shield size={8} /> Security
            </button>
            <div className="flex-1" />
            {/* Safe Execute Toggle */}
            <button onClick={() => setSafeExecute(!safeExecute)} className="flex items-center gap-1 text-[8px]">
              {safeExecute ? <ToggleRight size={14} style={{ color: CYBER_GREEN }} /> : <ToggleLeft size={14} style={{ color: '#666688' }} />}
              <span style={{ color: safeExecute ? CYBER_GREEN : '#8888aa' }}>Safe</span>
            </button>
            {/* Context Aware Toggle */}
            <button onClick={() => setContextAware(!contextAware)} className="flex items-center gap-1 text-[8px]">
              {contextAware ? <ToggleRight size={14} style={{ color: CYBER_CYAN }} /> : <ToggleLeft size={14} style={{ color: '#666688' }} />}
              <span style={{ color: contextAware ? CYBER_CYAN : '#8888aa' }}>Context</span>
            </button>
          </div>
        </div>
      )}

      {/* Multi-Step Command Plan */}
      {multiStepPlan && multiStepPlan.length > 0 && (
        <div className="px-3 py-2 border-t border-[rgba(0,255,136,0.15)] bg-[rgba(10,10,26,0.4)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ListChecks size={10} style={{ color: CYBER_GREEN }} />
              <span className="text-[8px] font-semibold" style={{ color: CYBER_GREEN }}>Multi-Step Plan</span>
            </div>
            <button onClick={() => setMultiStepPlan(null)} className="text-[#8888aa] hover:text-[#ff4444]">
              <X size={9} />
            </button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {multiStepPlan.map((step, i) => (
              <span key={step.id} className="flex items-center gap-1">
                <span className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{
                  color: step.status === 'pending' ? '#8888aa' : CYBER_GREEN,
                  background: step.status === 'pending' ? 'rgba(10,10,26,0.4)' : `${CYBER_GREEN}08`,
                  border: `1px solid ${step.status === 'pending' ? 'rgba(157,78,221,0.1)' : `${CYBER_GREEN}25`}`,
                }}>{step.command}</span>
                {i < multiStepPlan.length - 1 && <ArrowRight size={7} style={{ color: '#666688' }} />}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Natural Language Input */}
      {showNLInput && (
        <div className="px-3 py-2 border-t border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.5)]">
          <div className="flex items-center gap-2">
            <MessageSquare size={10} style={{ color: CYBER_GREEN }} />
            <span className="text-[8px] text-[#8888aa]">NL:</span>
            <input
              type="text"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nlInput.trim()) {
                  setIsGeneratingCmd(true);
                  setGeneratedCommand(null);
                  fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'execute', message: `Convert this natural language request to a ${tab.shell} shell command. Output ONLY the command, nothing else: ${nlInput}` }),
                  })
                    .then(res => res.json())
                    .then(data => {
                      const cmd = (data.response || '').trim().replace(/^`|`$/g, '');
                      setGeneratedCommand(cmd);
                      setIsGeneratingCmd(false);
                    })
                    .catch(() => {
                      setGeneratedCommand(null);
                      setIsGeneratingCmd(false);
                    });
                }
              }}
              placeholder="Describe what you want to do..."
              disabled={isGeneratingCmd}
              className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(0,255,136,0.15)] rounded px-2 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,136,0.3)] disabled:opacity-50"
            />
            {generatedCommand ? (
              <>
                <code className="text-[9px] px-2 py-1 rounded bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)]" style={{ color: CYBER_GREEN }}>{generatedCommand}</code>
                <button onClick={() => { setCommand(generatedCommand); setGeneratedCommand(null); setNlInput(''); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors">
                  <CheckCircle2 size={8} /> Use
                </button>
                <button onClick={() => { setGeneratedCommand(null); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
                  <X size={8} /> Discard
                </button>
              </>
            ) : isGeneratingCmd ? (
              <div className="flex items-center gap-1 text-[8px] text-[#8888aa]">
                <RefreshCw size={8} className="animate-spin" /> Generating...
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Command Input */}
      <div className="px-3 py-2.5 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: CYBER_CYAN }}>{shellPrompt()}</span>
          <input ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${tab.shell} command...`}
            disabled={tab.isRunning}
            className="flex-1 bg-transparent text-[11px] text-white font-mono placeholder:text-[#666688] outline-none disabled:opacity-50"
            autoFocus
          />
          <button onClick={() => executeCommand()} disabled={tab.isRunning || !command.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border disabled:opacity-30 hover:scale-105 active:scale-95 transition-all"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            <Play size={9} /> Run
          </button>
        </div>
      </div>
    </div>
  );
}
