'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Play, Square, Trash2, Code, Shield, Wifi,
  WifiOff, Clock, Cpu, HardDrive, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ChevronDown, History, Copy, Save,
  FileCode, Lock, Zap, Eye, Settings, RotateCcw, Download,
  Maximize2, Minimize2, Info, Hash,
} from 'lucide-react';

// ─── Types ───

type Language = 'python' | 'javascript' | 'typescript' | 'shell';
type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'timeout';

interface ExecutionResult {
  id: string;
  language: Language;
  code: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  status: ExecutionStatus;
  duration: number;
  timestamp: number;
  memoryUsed: number;
}

interface ResourceLimits {
  memoryMB: number;
  cpuTimeSec: number;
  outputSizeKB: number;
}

// ─── Color Constants ───

const LANGUAGE_COLORS: Record<Language, string> = {
  python: '#FFB627',
  javascript: '#E8751A',
  typescript: '#2E86AB',
  shell: '#00ff88',
};

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  shell: 'Shell',
};

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  idle: '#8888aa',
  running: '#FFB627',
  completed: '#00ff88',
  error: '#E63946',
  timeout: '#E8751A',
};

// ─── Mock code templates ───

const CODE_TEMPLATES: Record<Language, string> = {
  python: `import json
from datetime import datetime

# Agent analytics pipeline
def analyze_agent_metrics():
    metrics = {
        "claude": {"requests": 12847, "latency_ms": 142, "success_rate": 0.97},
        "hermes": {"requests": 24531, "latency_ms": 203, "success_rate": 0.94},
        "openclaw": {"requests": 8932, "latency_ms": 89, "success_rate": 0.99},
        "vault": {"requests": 89234, "latency_ms": 34, "success_rate": 1.0},
    }
    
    total_requests = sum(m["requests"] for m in metrics.values())
    avg_latency = sum(m["latency_ms"] for m in metrics.values()) / len(metrics)
    
    print(f"📊 Total Requests: {total_requests:,}")
    print(f"⚡ Avg Latency: {avg_latency:.1f}ms")
    print(f"📅 Timestamp: {datetime.now().isoformat()}")
    
    for agent, data in sorted(metrics.items(), key=lambda x: x[1]["requests"], reverse=True):
        bar = "█" * int(data["requests"] / 2500)
        print(f"  {agent:8s} │ {bar} {data['requests']:,} ({data['success_rate']*100:.1f}%)")
    
    return json.dumps(metrics, indent=2)

result = analyze_agent_metrics()
print(f"\\n✅ Analysis complete")`,

  javascript: `// Agent orchestration scheduler
const agents = [
  { name: 'Claude', layer: 4, tasks: 7, status: 'live' },
  { name: 'Hermes', layer: 2, tasks: 12, status: 'live' },
  { name: 'OpenClaw', layer: 3, tasks: 4, status: 'live' },
  { name: 'Self Vault', layer: 6, tasks: 2, status: 'live' },
];

function scheduleTask(agents, task) {
  const available = agents
    .filter(a => a.status === 'live')
    .sort((a, b) => a.tasks - b.tasks);
  
  const selected = available[0];
  selected.tasks++;
  
  console.log(\`📌 Task "\${task}" assigned to \${selected.name} (Layer \${selected.layer})\`);
  console.log(\`   Queue depth: \${selected.tasks} tasks\`);
  return selected;
}

console.log('🔄 Agent Orchestration Scheduler');
console.log('═'.repeat(40));

const tasks = [
  'Research competitor AI stacks',
  'Generate Q3 revenue report',
  'Sync MCP tool registry',
  'Export memory snapshot',
  'Deploy Hermes v3.2',
];

const assignments = tasks.map(task => scheduleTask(agents, task));

console.log('\\n📊 Final Agent Load:');
agents.forEach(a => {
  const bar = '█'.repeat(a.tasks);
  console.log(\`  \${a.name.padEnd(10)} │ \${bar} \${a.tasks}\`);
});

console.log('\\n✅ All tasks scheduled');`,

  typescript: `// Type-safe agent message bus
interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'task' | 'result' | 'query' | 'broadcast';
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

class MessageBus {
  private messages: AgentMessage[] = [];
  private subscribers: Map<string, (msg: AgentMessage) => void> = new Map();

  publish(message: AgentMessage): void {
    this.messages.push(message);
    const handler = this.subscribers.get(message.to);
    if (handler) handler(message);
    console.log(\`📨 \${message.from} → \${message.to}: [\${message.type}] \${message.priority}\`);
  }

  subscribe(agentId: string, handler: (msg: AgentMessage) => void): void {
    this.subscribers.set(agentId, handler);
    console.log(\`👂 \${agentId} subscribed to message bus\`);
  }

  getStats(): { total: number; byPriority: Record<string, number> } {
    const byPriority: Record<string, number> = {};
    this.messages.forEach(m => {
      byPriority[m.priority] = (byPriority[m.priority] || 0) + 1;
    });
    return { total: this.messages.length, byPriority };
  }
}

const bus = new MessageBus();

console.log('🚌 Agent Message Bus v2.0');
console.log('═'.repeat(40));

bus.subscribe('hermes', (msg) => console.log(\`  → Hermes received: \${msg.type}\`));
bus.subscribe('claude', (msg) => console.log(\`  → Claude received: \${msg.type}\`));

bus.publish({
  id: '1', from: 'Claude', to: 'hermes', type: 'task',
  payload: { action: 'research' }, priority: 'high', timestamp: Date.now()
});

bus.publish({
  id: '2', from: 'OpenClaw', to: 'claude', type: 'query',
  payload: { question: 'status?' }, priority: 'medium', timestamp: Date.now()
});

const stats = bus.getStats();
console.log(\`\\n📊 Bus Stats: \${stats.total} messages\`);
console.log(\`   Priority breakdown: \${JSON.stringify(stats.byPriority)}\`);`,

  shell: `#!/bin/bash
# Agent system health check

echo "🏥 Agent OS Health Check"
echo "═══════════════════════════════════════"

# Check agent processes
echo ""
echo "📋 Agent Processes:"
for agent in claude hermes openclaw vault; do
  pid=$((RANDOM + 1000))
  mem=$((RANDOM % 500 + 50))
  cpu=$((RANDOM % 100))
  status="✅ live"
  if [ $cpu -gt 80 ]; then
    status="⚠️  high CPU"
  fi
  printf "  %-10s PID: %-6s CPU: %3d%%  MEM: %4dMB  %s\\n" "$agent" "$pid" "$cpu" "$mem" "$status"
done

# Check network connectivity
echo ""
echo "🌐 Network Status:"
endpoints=("mcp://postgres-bridge.local" "mcp://brave-search.local" "mcp://github-copilot.local")
for ep in "\${endpoints[@]}"; do
  latency=$((RANDOM % 200 + 10))
  printf "  %-30s %3dms ✅\\n" "$ep" "$latency"
done

# Memory layer stats
echo ""
echo "💾 Memory Layer:"
vault_size="2.4GB"
entries=12847
echo "  Vault Size:    $vault_size"
echo "  Total Entries: $entries"
echo "  Decay Rate:    0.3% per day"

echo ""
echo "✅ Health check complete — all systems nominal"`,
};

// ─── Mock execution simulator ───

function simulateExecution(code: string, language: Language): { stdout: string; stderr: string; exitCode: number; duration: number; memoryUsed: number } {
  // Simulate some output based on language
  const outputs: Record<Language, { stdout: string; stderr: string; exitCode: number }> = {
    python: {
      stdout: `📊 Total Requests: 155,544
⚡ Avg Latency: 117.0ms
📅 Timestamp: ${new Date().toISOString()}
  vault    │ ████████████████████████████████ 89,234 (100.0%)
  hermes   │ █████████ 24,531 (94.0%)
  claude   │ █████ 12,847 (97.0%)
  openclaw │ ███ 8,932 (99.0%)

✅ Analysis complete`,
      stderr: '',
      exitCode: 0,
    },
    javascript: {
      stdout: `🔄 Agent Orchestration Scheduler
════════════════════════════════════
📌 Task "Research competitor AI stacks" assigned to Self Vault (Layer 6)
   Queue depth: 3 tasks
📌 Task "Generate Q3 revenue report" assigned to OpenClaw (Layer 3)
   Queue depth: 5 tasks
📌 Task "Sync MCP tool registry" assigned to Self Vault (Layer 6)
   Queue depth: 4 tasks
📌 Task "Export memory snapshot" assigned to OpenClaw (Layer 3)
   Queue depth: 6 tasks
📌 Task "Deploy Hermes v3.2" assigned to Self Vault (Layer 6)
   Queue depth: 5 tasks

📊 Final Agent Load:
  Claude     │ ████████ 7
  Hermes     │ █████████████ 12
  OpenClaw   │ ██████ 6
  Self Vault │ █████ 5

✅ All tasks scheduled`,
      stderr: '',
      exitCode: 0,
    },
    typescript: {
      stdout: `🚌 Agent Message Bus v2.0
════════════════════════════════════
👂 hermes subscribed to message bus
👂 claude subscribed to message bus
📨 Claude → hermes: [task] high
  → Hermes received: task
📨 OpenClaw → claude: [query] medium
  → Claude received: query

📊 Bus Stats: 2 messages
   Priority breakdown: {"high":1,"medium":1}`,
      stderr: '',
      exitCode: 0,
    },
    shell: {
      stdout: `🏥 Agent OS Health Check
═══════════════════════════════════════

📋 Agent Processes:
  claude     PID: 4821   CPU:  42%  MEM:  280MB  ✅ live
  hermes     PID: 7234   CPU:  67%  MEM:  420MB  ⚠️  high CPU
  openclaw   PID: 3156   CPU:  28%  MEM:  180MB  ✅ live
  vault      PID: 9102   CPU:  12%  MEM:  150MB  ✅ live

🌐 Network Status:
  mcp://postgres-bridge.local       45ms ✅
  mcp://brave-search.local         128ms ✅
  mcp://github-copilot.local        67ms ✅

💾 Memory Layer:
  Vault Size:    2.4GB
  Total Entries: 12847
  Decay Rate:    0.3% per day

✅ Health check complete — all systems nominal`,
      stderr: '',
      exitCode: 0,
    },
  };

  const output = outputs[language];
  return {
    ...output,
    duration: Math.floor(Math.random() * 3000 + 800),
    memoryUsed: Math.floor(Math.random() * 128 + 32),
  };
}

// ─── GlassCard Component ───

function GlassCard({ children, className = '', glowColor }: {
  children: React.ReactNode; className?: string; glowColor?: string;
}) {
  return (
    <motion.div
      className={`rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] ${className}`}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Component ───

export function SandboxExecution() {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(CODE_TEMPLATES.python);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [output, setOutput] = useState<{ stdout: string; stderr: string; exitCode: number | null; duration: number; memoryUsed: number } | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);
  const [resourceLimits, setResourceLimits] = useState<ResourceLimits>({ memoryMB: 512, cpuTimeSec: 30, outputSizeKB: 1024 });
  const [showLimits, setShowLimits] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const languages: Language[] = ['python', 'javascript', 'typescript', 'shell'];

  // Change language + template
  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setCode(CODE_TEMPLATES[lang]);
    setOutput(null);
    setExecutionStatus('idle');
  }, []);

  // Run code
  const handleRun = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionStatus('running');
    setOutput(null);

    // Simulate execution with typing effect
    setTimeout(() => {
      const result = simulateExecution(code, language);
      setOutput(result);
      setExecutionStatus(result.exitCode === 0 ? 'completed' : 'error');
      setIsRunning(false);

      // Add to history
      const historyEntry: ExecutionResult = {
        id: `exec-${Date.now()}`,
        language,
        code,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        status: result.exitCode === 0 ? 'completed' : 'error',
        duration: result.duration,
        timestamp: Date.now(),
        memoryUsed: result.memoryUsed,
      };
      setExecutionHistory(prev => [historyEntry, ...prev].slice(0, 10));
    }, 1500 + Math.random() * 1000);
  }, [code, language, isRunning]);

  // Stop execution
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setExecutionStatus('idle');
    setOutput({ stdout: '', stderr: 'Execution cancelled by user', exitCode: 130, duration: 0, memoryUsed: 0 });
  }, []);

  // Clear output
  const handleClear = useCallback(() => {
    setOutput(null);
    setExecutionStatus('idle');
  }, []);

  // Re-run from history
  const handleRerun = useCallback((entry: ExecutionResult) => {
    setLanguage(entry.language);
    setCode(entry.code);
    setOutput(null);
    setExecutionStatus('idle');
  }, []);

  // Copy output
  const handleCopyOutput = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output.stdout + (output.stderr ? '\n\n--- STDERR ---\n' + output.stderr : ''));
    }
  }, [output]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={isRunning ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isRunning ? 'rgba(255,182,39,0.1)' : 'rgba(0,255,136,0.1)', boxShadow: isRunning ? '0 0 15px rgba(255,182,39,0.3)' : '0 0 15px rgba(0,255,136,0.3)' }}
          >
            <Terminal className="w-5 h-5" style={{ color: isRunning ? '#FFB627' : '#00ff88' }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Sandboxed Execution</h2>
            <p className="text-sm" style={{ color: '#8888aa' }}>
              Run agent-generated code in isolated containers
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)]">
            <Lock size={10} style={{ color: '#00ff88' }} />
            <span className="text-[9px] font-mono" style={{ color: '#00ff88' }}>SANDBOXED</span>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88' }}
            />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[rgba(157,78,221,0.2)] bg-[rgba(157,78,221,0.05)]">
            <WifiOff size={10} style={{ color: '#9d4edd' }} />
            <span className="text-[9px] font-mono" style={{ color: '#9d4edd' }}>NO NETWORK</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[rgba(0,255,255,0.2)] bg-[rgba(0,255,255,0.05)]">
            <Shield size={10} style={{ color: '#00ffff' }} />
            <span className="text-[9px] font-mono" style={{ color: '#00ffff' }}>v8 ISOLATE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Code Editor + Output */}
        <div className="lg:col-span-2 space-y-4">
          {/* Language Selector + Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Language tabs */}
              {languages.map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: language === lang ? `${LANGUAGE_COLORS[lang]}20` : 'rgba(18,18,42,0.4)',
                    color: language === lang ? LANGUAGE_COLORS[lang] : '#8888aa',
                    border: `1px solid ${language === lang ? `${LANGUAGE_COLORS[lang]}40` : 'rgba(157,78,221,0.1)'}`,
                    boxShadow: language === lang ? `0 0 8px ${LANGUAGE_COLORS[lang]}20` : 'none',
                  }}
                >
                  <FileCode size={11} /> {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowLimits(!showLimits)} className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors" aria-label="Resource limits">
                <Settings size={12} style={{ color: '#8888aa' }} />
              </button>
            </div>
          </div>

          {/* Resource Limits Panel */}
          <AnimatePresence>
            {showLimits && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <GlassCard className="p-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1"><HardDrive size={9} /> Memory Limit</div>
                      <select value={resourceLimits.memoryMB} onChange={e => setResourceLimits(prev => ({ ...prev, memoryMB: parseInt(e.target.value) }))} className="w-full px-2 py-1 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] text-white focus:outline-none">
                        <option value={128}>128 MB</option>
                        <option value={256}>256 MB</option>
                        <option value={512}>512 MB</option>
                        <option value={1024}>1 GB</option>
                        <option value={2048}>2 GB</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1"><Cpu size={9} /> CPU Timeout</div>
                      <select value={resourceLimits.cpuTimeSec} onChange={e => setResourceLimits(prev => ({ ...prev, cpuTimeSec: parseInt(e.target.value) }))} className="w-full px-2 py-1 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] text-white focus:outline-none">
                        <option value={5}>5 sec</option>
                        <option value={10}>10 sec</option>
                        <option value={30}>30 sec</option>
                        <option value={60}>60 sec</option>
                        <option value={120}>120 sec</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1"><Eye size={9} /> Max Output</div>
                      <select value={resourceLimits.outputSizeKB} onChange={e => setResourceLimits(prev => ({ ...prev, outputSizeKB: parseInt(e.target.value) }))} className="w-full px-2 py-1 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] text-white focus:outline-none">
                        <option value={64}>64 KB</option>
                        <option value={256}>256 KB</option>
                        <option value={1024}>1 MB</option>
                        <option value={4096}>4 MB</option>
                      </select>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Code Editor */}
          <GlassCard glowColor={isRunning ? '#FFB627' : undefined} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(157,78,221,0.1)]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#E6394650]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFB62750]" />
                  <div className="w-3 h-3 rounded-full bg-[#00ff8850]" />
                </div>
                <span className="text-[10px] font-mono" style={{ color: LANGUAGE_COLORS[language] }}>
                  {LANGUAGE_LABELS[language]}
                </span>
                <span className="text-[9px] font-mono text-[#8888aa]">
                  {code.split('\n').length} lines
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isRunning && (
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(255,182,39,0.1)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFB627]" />
                    <span className="text-[8px] font-mono text-[#FFB627]">Running</span>
                  </motion.div>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={isRunning}
              className="w-full h-72 bg-transparent text-[11px] font-mono text-[#ccccdd] p-4 focus:outline-none resize-none custom-scrollbar"
              style={{ tabSize: 2, lineHeight: '1.6' }}
              spellCheck={false}
              placeholder="Write your code here..."
            />
          </GlassCard>

          {/* Execution Controls */}
          <div className="flex items-center gap-2">
            <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.1)] text-xs font-semibold hover:bg-[rgba(0,255,136,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: '#00ff88' }}>
              {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />} {isRunning ? 'Running...' : 'Run'}
            </button>
            <button onClick={handleStop} disabled={!isRunning} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)] text-xs hover:bg-[rgba(230,57,70,0.1)] transition-all disabled:opacity-30 disabled:cursor-not-allowed" style={{ color: '#E63946' }}>
              <Square size={12} /> Stop
            </button>
            <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-xs hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#ccccdd' }}>
              <Trash2 size={12} /> Clear
            </button>
            <div className="flex-1" />
            {output && (
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono flex items-center gap-1" style={{ color: output.exitCode === 0 ? '#00ff88' : '#E63946' }}>
                  {output.exitCode === 0 ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  Exit: {output.exitCode}
                </span>
                <span className="text-[9px] font-mono" style={{ color: '#8888aa' }}>{output.duration}ms</span>
                <span className="text-[9px] font-mono" style={{ color: '#8888aa' }}>{output.memoryUsed}MB</span>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <AnimatePresence>
            {output && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard glowColor={output.exitCode === 0 ? '#00ff88' : '#E63946'} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(157,78,221,0.1)]">
                    <div className="flex items-center gap-2">
                      <Terminal size={12} style={{ color: '#00ff88' }} />
                      <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Output</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold" style={{ background: `${STATUS_COLORS[executionStatus]}20`, color: STATUS_COLORS[executionStatus] }}>
                        {executionStatus.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={handleCopyOutput} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-md border border-[rgba(157,78,221,0.1)] hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#8888aa' }}>
                      <Copy size={9} /> Copy
                    </button>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto custom-scrollbar">
                    {output.stdout && (
                      <pre className="text-[11px] font-mono text-[#00ff88] whitespace-pre-wrap leading-relaxed">{output.stdout}</pre>
                    )}
                    {output.stderr && (
                      <div className="mt-2 pt-2 border-t border-[rgba(230,57,70,0.1)]">
                        <div className="text-[9px] text-[#E63946] uppercase tracking-wider mb-1">stderr</div>
                        <pre className="text-[11px] font-mono text-[#E63946] whitespace-pre-wrap leading-relaxed">{output.stderr}</pre>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar: History + Security */}
        <div className="space-y-4">
          {/* Security Status */}
          <GlassCard glowColor="#00ff88" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-[#00ff88]" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Security Status</span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Sandbox Isolation', active: true, icon: <Lock size={11} />, color: '#00ff88' },
                { label: 'Network Isolation', active: true, icon: <WifiOff size={11} />, color: '#9d4edd' },
                { label: 'Memory Limit', active: true, icon: <HardDrive size={11} />, color: '#00ffff', detail: `${resourceLimits.memoryMB}MB` },
                { label: 'CPU Timeout', active: true, icon: <Cpu size={11} />, color: '#FFB627', detail: `${resourceLimits.cpuTimeSec}s` },
                { label: 'Output Truncation', active: true, icon: <Eye size={11} />, color: '#E8751A', detail: `${resourceLimits.outputSizeKB}KB` },
                { label: 'Filesystem Read-Only', active: true, icon: <Lock size={11} />, color: '#2E86AB' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-[rgba(10,10,26,0.4)] rounded-lg p-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-white flex-1">{item.label}</span>
                  {item.detail && <span className="text-[9px] font-mono" style={{ color: item.color }}>{item.detail}</span>}
                  <CheckCircle2 size={11} style={{ color: '#00ff88' }} />
                </div>
              ))}
            </div>

            {/* Running indicator */}
            <AnimatePresence>
              {isRunning && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <RefreshCw size={12} style={{ color: '#FFB627' }} />
                    </motion.div>
                    <span className="text-[10px] font-mono" style={{ color: '#FFB627' }}>Executing in sandbox...</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#FFB62788] to-[#FFB627]"
                      animate={{ width: ['0%', '100%'] }}
                      transition={{ duration: 2.5, ease: 'easeInOut' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Execution History */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={14} className="text-[#00ffff]" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">History</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,255,255,0.1)', color: '#00ffff' }}>{executionHistory.length}</span>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1.5">
              {executionHistory.length === 0 ? (
                <div className="text-center py-6">
                  <Terminal size={20} className="mx-auto mb-2" style={{ color: '#8888aa30' }} />
                  <div className="text-[10px] text-[#8888aa]">No executions yet</div>
                  <div className="text-[9px] text-[#666680] mt-1">Run some code to see history here</div>
                </div>
              ) : (
                <AnimatePresence>
                  {executionHistory.map((entry, i) => {
                    const statusColor = STATUS_COLORS[entry.status];
                    return (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }} className="bg-[rgba(10,10,26,0.4)] rounded-lg p-2.5 cursor-pointer hover:bg-[rgba(157,78,221,0.08)] transition-colors group" onClick={() => handleRerun(entry)}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] px-1 py-0.5 rounded font-mono font-bold" style={{ background: `${LANGUAGE_COLORS[entry.language]}20`, color: LANGUAGE_COLORS[entry.language] }}>
                              {entry.language.toUpperCase()}
                            </span>
                            <span className="text-[8px]" style={{ color: statusColor }}>
                              {entry.status === 'completed' ? <CheckCircle2 size={8} className="inline" /> : <XCircle size={8} className="inline" />}
                              {' '}{entry.exitCode === 0 ? '0' : entry.exitCode}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono text-[#8888aa]">{entry.duration}ms</span>
                        </div>
                        <div className="text-[9px] text-[#ccccdd] truncate font-mono">{entry.code.split('\n')[0]}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[8px] font-mono text-[#8888aa]">{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                          <span className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#00ff88' }}>↻ Re-run</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(18,18,42,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157,78,221,0.3); border-radius: 2px; }
        textarea { caret-color: #00ffff; }
        textarea::selection { background: rgba(0,255,255,0.2); }
        textarea:focus { outline: none; }
      `}</style>
    </div>
  );
}
