'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2, Minimize2, Settings, ChevronLeft, ChevronRight,
  Timer, Shield, Zap, MessageSquare, Bot, Eye, EyeOff,
  Play, Pause, RotateCcw, Bell, BellOff, X, Brain,
  Sparkles, Clock, Monitor, Cpu, Wifi, Layers,
  Target, Award, Coffee, Flame, Radio, Volume2,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Constants ─── */
const AGENT_COLORS: Record<string, string> = {
  claude: '#E63946',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
};

const AGENT_NAMES: Record<string, string> = {
  claude: 'Claude',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
  vault: 'Vault',
};

/* ─── Types ─── */
interface ChatMsg {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

interface FocusMemory {
  id: string;
  title: string;
  relevance: number;
  agent: string;
  snippet: string;
}

/* ─── Mock Data ─── */
const MOCK_CHAT: ChatMsg[] = [
  { id: 'c1', role: 'system', content: 'Focus session initialized. All non-essential notifications suppressed.', timestamp: '10:00' },
  { id: 'c2', role: 'user', content: 'Help me design the RAG pipeline architecture for the knowledge base', timestamp: '10:01' },
  { id: 'c3', role: 'agent', content: 'I\'ll help you design a RAG pipeline. Based on your previous work on memory systems and the existing vector store, I recommend a multi-stage retrieval approach:\n\n1. **Query Processing** — Intent classification + query expansion\n2. **Embedding** — Use text-embedding-3-large for semantic search\n3. **Retrieval** — Hybrid search (dense + sparse) with MMR reranking\n4. **Ranking** — Cross-encoder reranking for precision\n5. **Generation** — Context-window aware prompt assembly', timestamp: '10:02' },
  { id: 'c4', role: 'user', content: 'What about chunking strategy? What worked best in our tests?', timestamp: '10:04' },
  { id: 'c5', role: 'agent', content: 'Based on your benchmark results from last week:\n\n- **Recursive character splitting** with 512 token chunks and 64 token overlap performed best for your document types\n- **Semantic chunking** improved recall by 12% but added 300ms latency\n- Your sweet spot is recursive splitting + metadata-enriched chunks with section headers\n\nI\'ve already updated the config to match these findings.', timestamp: '10:05' },
  { id: 'c6', role: 'user', content: 'Perfect. Now let\'s optimize the embedding batch size for throughput.', timestamp: '10:08' },
  { id: 'c7', role: 'agent', content: 'For your current document volume (12K chunks), the optimal batch size is **256**. This gives you:\n\n- **Throughput**: ~1,200 chunks/sec on text-embedding-3-large\n- **Memory**: Peaks at 2.1GB VRAM (well within your A100 allocation)\n- **Latency**: Batch processing completes in ~10 seconds\n\nI can auto-scale this based on queue depth if you enable the adaptive batching flag.', timestamp: '10:09' },
];

const MOCK_MEMORIES: FocusMemory[] = [
  { id: 'fm1', title: 'RAG Pipeline Design Doc', relevance: 0.95, agent: 'claude', snippet: 'Multi-stage retrieval with hybrid search, MMR reranking, and cross-encoder precision boost' },
  { id: 'fm2', title: 'Chunking Benchmark Results', relevance: 0.88, agent: 'hermes', snippet: '512 token recursive split + 64 overlap = best F1 score across all document types' },
  { id: 'fm3', title: 'Embedding Model Comparison', relevance: 0.82, agent: 'vault', snippet: 'text-embedding-3-large vs cohere-embed-v3: 2% better recall, 15% higher cost' },
  { id: 'fm4', title: 'User Query Patterns', relevance: 0.76, agent: 'openclaw', snippet: '72% of queries are factual retrieval, 28% are analytical synthesis' },
  { id: 'fm5', title: 'Previous Sprint Retrospective', relevance: 0.61, agent: 'vault', snippet: 'Latency reduced to 180ms avg, hit rate improved to 94.2%' },
];

/* ═══════════════════════════════════════════════════════════
   POMODORO TIMER
   ═══════════════════════════════════════════════════════════ */
function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(3);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsRunning(false);
            if (modeRef.current === 'focus') {
              setSessions(s => s + 1);
              setMode('break');
              return 5 * 60;
            } else {
              setMode('focus');
              return 25 * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const toggle = useCallback(() => setIsRunning(p => !p), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  }, [mode]);

  const accentColor = mode === 'focus' ? '#00ffff' : '#00ff88';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular timer */}
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(10,10,26,0.8)" strokeWidth="2.5" />
          <motion.circle
            cx="50" cy="50" r="44" fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
            style={{ filter: `drop-shadow(0 0 8px ${accentColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-mono font-bold text-white">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-[7px] uppercase tracking-[0.2em] font-bold" style={{ color: accentColor }}>
            {mode}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(157,78,221,0.2)] bg-[rgba(18,18,42,0.5)] text-[#8888aa] hover:text-white transition-colors">
          <RotateCcw size={11} />
        </button>
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: `${accentColor}12`, border: `1.5px solid ${accentColor}35`, color: accentColor, boxShadow: `0 0 20px ${accentColor}15` }}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </motion.button>
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}60` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
        <span className="text-[9px] text-[#8888aa] ml-1 font-mono">{sessions} sessions</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT SELECTOR — Quick Switch
   ═══════════════════════════════════════════════════════════ */
function AgentSelector({ activeAgent, onSelect }: { activeAgent: string; onSelect: (id: string) => void }) {
  const agents = Object.entries(AGENT_NAMES);
  return (
    <div className="flex items-center gap-1.5">
      {agents.map(([id, name]) => {
        const color = AGENT_COLORS[id];
        const isActive = id === activeAgent;
        return (
          <motion.button
            key={id}
            onClick={() => onSelect(id)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border"
              style={{
                background: isActive ? `${color}18` : 'rgba(18,18,42,0.4)',
                borderColor: isActive ? `${color}50` : 'rgba(157,78,221,0.1)',
                color: isActive ? color : '#8888aa',
                boxShadow: isActive ? `0 0 16px ${color}20` : 'none',
              }}
            >
              {name[0]}
            </div>
            {isActive && (
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                layoutId="focus-agent-indicator"
              />
            )}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-[9px] text-white shadow-lg">
                {name}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING TOOLBAR
   ═══════════════════════════════════════════════════════════ */
function FloatingToolbar({
  onToggleTimer, onToggleContext, onSettings, onExit, onFullscreen, isFullscreen, contextOpen, timerVisible,
}: {
  onToggleTimer: () => void;
  onToggleContext: () => void;
  onSettings: () => void;
  onExit: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  contextOpen: boolean;
  timerVisible: boolean;
}) {
  const agentColor = '#00ffff';
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-2 rounded-2xl border backdrop-blur-xl"
      style={{
        background: 'rgba(10,10,26,0.75)',
        borderColor: `${agentColor}20`,
        boxShadow: `0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 ${agentColor}08`,
      }}
    >
      <ToolbarButton icon={Timer} active={timerVisible} color={agentColor} onClick={onToggleTimer} tooltip="Timer" />
      <ToolbarButton icon={Brain} active={contextOpen} color={agentColor} onClick={onToggleContext} tooltip="Context" />
      <div className="w-px h-5 bg-[rgba(157,78,221,0.15)] mx-0.5" />
      <ToolbarButton icon={Settings} active={false} color="#9d4edd" onClick={onSettings} tooltip="Settings" />
      <ToolbarButton icon={isFullscreen ? Minimize2 : Maximize2} active={isFullscreen} color="#00ff88" onClick={onFullscreen} tooltip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} />
      <div className="w-px h-5 bg-[rgba(157,78,221,0.15)] mx-0.5" />
      <ToolbarButton icon={X} active={false} color="#E63946" onClick={onExit} tooltip="Exit Focus" />
    </motion.div>
  );
}

function ToolbarButton({ icon: Icon, active, color, onClick, tooltip }: {
  icon: typeof Timer; active: boolean; color: string; onClick: () => void; tooltip: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all relative group"
      style={{
        background: active ? `${color}12` : 'transparent',
        border: active ? `1px solid ${color}30` : '1px solid transparent',
        color: active ? color : '#8888aa',
        boxShadow: active ? `0 0 12px ${color}15` : 'none',
      }}
    >
      <Icon size={14} />
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-[9px] text-white shadow-lg">{tooltip}</div>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   DISTRACTION COUNTER
   ═══════════════════════════════════════════════════════════ */
function DistractionCounter({ count, muted, onToggle }: { count: number; muted: boolean; onToggle: () => void }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm cursor-pointer"
      style={{
        background: muted ? 'rgba(0,255,136,0.06)' : 'rgba(230,57,70,0.06)',
        borderColor: muted ? 'rgba(0,255,136,0.2)' : 'rgba(230,57,70,0.2)',
      }}
      onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
        key={count}
      >
        {muted ? <BellOff size={12} className="text-[#00ff88]" /> : <Bell size={12} className="text-[#E63946]" />}
      </motion.div>
      <div className="flex flex-col">
        <span className="text-white font-mono font-bold text-sm">{count}</span>
        <span className="text-[7px] uppercase tracking-widest" style={{ color: muted ? '#00ff88' : '#E63946' }}>
          {muted ? 'blocked' : 'active'}
        </span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOCUS MODE — Main Export
   ═══════════════════════════════════════════════════════════ */
export function FocusMode() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('claude');
  const [contextOpen, setContextOpen] = useState(true);
  const [blockedCount, setBlockedCount] = useState(14);
  const [muted, setMuted] = useState(true);
  const [chatMessages] = useState<ChatMsg[]>(MOCK_CHAT);
  const [inputValue, setInputValue] = useState('');
  const [timerVisible, setTimerVisible] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);

  // Simulate blocked notifications
  useEffect(() => {
    if (!muted) return;
    const interval = setInterval(() => {
      setBlockedCount(c => c + 1);
    }, 6000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [muted]);

  const agentColor = AGENT_COLORS[activeAgent] || '#00ffff';

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a0a1a] p-0' : ''}`}>
      {/* ─── Floating Toolbar ─── */}
      {showToolbar && (
        <FloatingToolbar
          onToggleTimer={() => setTimerVisible(!timerVisible)}
          onToggleContext={() => setContextOpen(!contextOpen)}
          onSettings={() => {}}
          onExit={() => { setIsFullscreen(false); }}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          isFullscreen={isFullscreen}
          contextOpen={contextOpen}
          timerVisible={timerVisible}
        />
      )}

      {/* ─── Breathing Border Effect ─── */}
      {isFullscreen && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-40 rounded-none"
          animate={{
            boxShadow: [
              `inset 0 0 60px ${agentColor}06, inset 0 0 120px ${agentColor}02`,
              `inset 0 0 100px ${agentColor}12, inset 0 0 200px ${agentColor}06`,
              `inset 0 0 60px ${agentColor}06, inset 0 0 120px ${agentColor}02`,
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ─── Header ─── */}
      <div className={`flex items-center justify-between ${isFullscreen ? 'pt-14 px-6' : ''}`}>
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Eye size={16} className="text-[#00ffff]" />
          Focus Mode
          {isFullscreen && (
            <motion.span
              className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{ backgroundColor: '#00ffff12', color: '#00ffff', border: '1px solid #00ffff25' }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              Immersive
            </motion.span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <DistractionCounter
            count={blockedCount}
            muted={muted}
            onToggle={() => { setMuted(!muted); if (!muted) setBlockedCount(0); }}
          />
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
              style={{ background: 'rgba(18,18,42,0.5)', borderColor: 'rgba(0,255,255,0.2)', color: '#00ffff' }}
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div className={`flex gap-4 relative ${isFullscreen ? 'px-6 h-[calc(100vh-8rem)]' : ''}`}>
        {/* ─── Chat Area ─── */}
        <motion.div
          className="flex-1 rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden flex flex-col"
          style={{
            borderColor: `${agentColor}20`,
          }}
          animate={{
            borderColor: isFullscreen
              ? [`${agentColor}18`, `${agentColor}35`, `${agentColor}18`]
              : `${agentColor}20`,
          }}
          transition={isFullscreen ? { duration: 3, repeat: Infinity } : { duration: 0 }}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
            <div className="flex items-center gap-3">
              <AgentSelector activeAgent={activeAgent} onSelect={setActiveAgent} />
              <div className="w-px h-5 bg-[rgba(157,78,221,0.15)]" />
              <span className="text-[10px] text-[#8888aa]">
                Chatting with <span style={{ color: agentColor }} className="font-semibold">{AGENT_NAMES[activeAgent]}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.05)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[8px] text-[#00ff88] font-mono">LIVE</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: isFullscreen ? 'calc(100vh - 18rem)' : '24rem' }}>
            {chatMessages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role !== 'system' && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 border"
                    style={{
                      backgroundColor: msg.role === 'agent' ? `${agentColor}12` : 'rgba(157,78,221,0.12)',
                      borderColor: msg.role === 'agent' ? `${agentColor}25` : 'rgba(157,78,221,0.25)',
                      color: msg.role === 'agent' ? agentColor : '#c084fc',
                    }}
                  >
                    {msg.role === 'agent' ? AGENT_NAMES[activeAgent][0] : 'U'}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 border ${
                    msg.role === 'system' ? 'mx-auto text-center' : msg.role === 'user' ? '' : ''
                  }`}
                  style={
                    msg.role === 'agent'
                      ? { background: `${agentColor}05`, borderColor: `${agentColor}12` }
                      : msg.role === 'system'
                        ? { background: 'rgba(18,18,42,0.4)', borderColor: 'rgba(0,255,255,0.1)' }
                        : { background: 'rgba(157,78,221,0.06)', borderColor: 'rgba(157,78,221,0.12)' }
                  }
                >
                  <div className="text-[12px] text-white leading-relaxed whitespace-pre-wrap">
                    {msg.content.split('**').map((part, j) =>
                      j % 2 === 1 ? (
                        <strong key={j} style={{ color: agentColor }}>{part}</strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </div>
                  <div className="text-[8px] text-[#8888aa] mt-1.5 flex items-center gap-1">
                    <Clock size={7} /> {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-[rgba(10,10,26,0.6)] border border-[rgba(157,78,221,0.15)] rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,255,0.3)] transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: `${agentColor}12`, border: `1.5px solid ${agentColor}30`, color: agentColor, boxShadow: `0 0 16px ${agentColor}15` }}
              >
                <Sparkles size={14} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ─── Context Panel (Collapsible) ─── */}
        <AnimatePresence>
          {contextOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden flex-shrink-0"
            >
              <div className="w-[280px] rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden h-full flex flex-col">
                {/* Context header */}
                <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                      <Brain size={12} className="text-[#00ffff]" /> Context
                    </span>
                    <button onClick={() => setContextOpen(false)} className="text-[#8888aa] hover:text-white transition-colors">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="text-[9px] text-[#8888aa] mt-1">
                    {MOCK_MEMORIES.length} relevant memories · synced <span className="text-[#00ff88]">2s ago</span>
                  </div>
                </div>

                {/* Timer section */}
                {timerVisible && (
                  <div className="px-4 py-4 border-b border-[rgba(157,78,221,0.08)]">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Timer size={10} className="text-[#00ffff]" />
                      <span className="text-[9px] text-[#8888aa] uppercase tracking-wider font-bold">Focus Timer</span>
                    </div>
                    <PomodoroTimer />
                  </div>
                )}

                {/* Memory list */}
                <div className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    {MOCK_MEMORIES.map((mem, i) => {
                      const memColor = AGENT_COLORS[mem.agent] || '#8888aa';
                      return (
                        <motion.div
                          key={mem.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-lg border p-2.5 group hover:border-[rgba(0,255,255,0.2)] transition-all cursor-pointer"
                          style={{ borderColor: 'rgba(157,78,221,0.08)', background: 'rgba(10,10,26,0.3)' }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
                              style={{ backgroundColor: `${memColor}20`, color: memColor }}
                            >
                              {(AGENT_NAMES[mem.agent] || mem.agent)[0]}
                            </div>
                            <span className="text-[10px] text-white font-medium truncate flex-1">{mem.title}</span>
                            <div className="flex items-center gap-0.5">
                              <div className="w-8 h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${mem.relevance * 100}%`,
                                    background: `linear-gradient(90deg, ${agentColor}88, ${agentColor})`,
                                  }}
                                />
                              </div>
                              <span className="text-[7px] font-mono text-[#8888aa]">{Math.round(mem.relevance * 100)}%</span>
                            </div>
                          </div>
                          <p className="text-[9px] text-[#8888aa] leading-relaxed">{mem.snippet}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Context actions */}
                <div className="px-3 py-2.5 border-t border-[rgba(157,78,221,0.08)]">
                  <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-medium text-[#8888aa] hover:text-[#00ffff] border border-[rgba(157,78,221,0.08)] hover:border-[rgba(0,255,255,0.2)] transition-all">
                    <Zap size={9} /> Load more memories
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Focus Stats Bar ─── */}
      <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${isFullscreen ? 'px-6' : ''}`}>
        {[
          { label: 'Focus Time', value: '1h 24m', icon: Timer, color: '#00ffff' },
          { label: 'Blocked', value: String(blockedCount), icon: Shield, color: '#00ff88' },
          { label: 'Messages', value: String(chatMessages.length), icon: MessageSquare, color: '#FFB627' },
          { label: 'Agent', value: AGENT_NAMES[activeAgent], icon: Bot, color: agentColor },
          { label: 'Sessions', value: '3', icon: Flame, color: '#E8751A' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3 backdrop-blur-sm"
            style={{ borderColor: `${s.color}18`, background: `${s.color}04` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={10} style={{ color: s.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: s.color }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
