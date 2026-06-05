'use client';

// ============================================================
// Agentic OS V2 — Main Page
// ============================================================
import { useState, useEffect } from 'react';
import { useOSStore } from '@/lib/store';
import { AppSidebar } from '@/components/app-sidebar';
import { ChatWorkspace } from '@/components/chat-workspace';
import { ArtifactPanel } from '@/components/artifact-panel';
import { TerminalPanel } from '@/components/terminal-panel';
import { AgentMonitor } from '@/components/agent-monitor';
import { ModelMonitor } from '@/components/model-monitor';
import { HomeDashboard } from '@/components/home-dashboard';
import { SwarmViewer } from '@/components/swarm-viewer';
import { ObservabilityDashboard } from '@/components/observability-dashboard';
import { MemoryBrowser } from '@/components/memory-browser';
import { KnowledgeBrowser } from '@/components/knowledge-browser';
import { SettingsPanel } from '@/components/settings-panel';
import type { ViewType } from '@/lib/types';
import { Bot, Terminal, Activity, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Sub-views ───

function AgentsView() {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; type: string; status: string; currentTask?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const spawnAgent = async (type: string) => {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const res = await fetch('/api/agents');
    const data = await res.json();
    setAgents(data.agents ?? []);
  };

  const agentTypes = ['planner', 'architect', 'researcher', 'coder', 'reviewer', 'verifier', 'memory'];
  const agentColors: Record<string, string> = {
    planner: '#FFB627', architect: '#00ffff', researcher: '#2E86AB',
    coder: '#00ff88', reviewer: '#9d4edd', verifier: '#E8751A', memory: '#1B998B',
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[#00ff88]" />
        <h2 className="text-xl font-bold text-foreground">Agent Registry</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {agentTypes.map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => spawnAgent(type)}
            className="text-xs capitalize" style={{ borderColor: `${agentColors[type]}30`, color: agentColors[type] }}>
            + {type}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No agents spawned yet</p>
          <p className="text-xs mt-1">Click the buttons above to spawn agents</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <motion.div key={agent.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${agentColors[agent.type] ?? '#888'}15`, color: agentColors[agent.type] ?? '#888' }}>
                  {agent.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{agent.type}</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-[#00ff88]' : agent.status === 'error' ? 'bg-[#E6394A]' : 'bg-muted-foreground'}`} />
                  <span className="text-[10px] text-muted-foreground">{agent.status}</span>
                </div>
              </div>
              {agent.currentTask && (
                <div className="mt-2 text-xs text-muted-foreground truncate">Task: {agent.currentTask}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtifactsView() {
  const [artifacts, setArtifacts] = useState<Array<{ id: string; name: string; type: string; version: number }>>([]);
  const { setActiveArtifact, setArtifactPanelOpen } = useOSStore();

  useEffect(() => {
    fetch('/api/artifacts')
      .then((r) => r.json())
      .then((data) => setArtifacts(data.artifacts ?? []))
      .catch(() => setArtifacts([]));
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <FileCode className="w-6 h-6 text-[#E8751A]" />
        <h2 className="text-xl font-bold text-foreground">Artifacts</h2>
      </div>

      {artifacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileCode className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No artifacts yet</p>
          <p className="text-xs mt-1">Artifacts are created during chat sessions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {artifacts.map((a) => (
            <Card key={a.id} className="bg-card border-border cursor-pointer hover:border-[#9d4edd]/30 transition-colors"
              onClick={() => { setActiveArtifact(a as never); setArtifactPanelOpen(true); }}>
              <CardContent className="p-4">
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.type} · v{a.version}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalView() {
  const { setTerminalOpen } = useOSStore();
  useEffect(() => { setTerminalOpen(true); }, [setTerminalOpen]);
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Terminal className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Terminal panel is open at the bottom</p>
        <p className="text-xs mt-1">Type naturally or use commands</p>
      </div>
    </div>
  );
}

// ─── View Router ───

function ViewRenderer({ view }: { view: ViewType }) {
  switch (view) {
    case 'home': return <HomeDashboard />;
    case 'chat': return <ChatWorkspace />;
    case 'agents': return <AgentsView />;
    case 'swarm': return <SwarmViewer />;
    case 'memory': return <MemoryBrowser />;
    case 'knowledge': return <KnowledgeBrowser />;
    case 'artifacts': return <ArtifactsView />;
    case 'terminal': return <TerminalView />;
    case 'observability': return <ObservabilityDashboard />;
    case 'settings': return <SettingsPanel />;
    default: return <HomeDashboard />;
  }
}

// ─── Main Page ───

export default function HomePage() {
  const {
    activeView, artifactPanelOpen, terminalOpen,
    agentMonitorVisible, modelMonitorVisible,
    setAgentMonitorVisible, setModelMonitorVisible, setTerminalOpen,
  } = useOSStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAgentMonitorVisible(!agentMonitorVisible);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setModelMonitorVisible(!modelMonitorVisible);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [agentMonitorVisible, modelMonitorVisible, terminalOpen, setAgentMonitorVisible, setModelMonitorVisible, setTerminalOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a]">
      {/* Left Sidebar */}
      <AppSidebar />

      {/* Center Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative pb-8">
        {/* Main view */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <ViewRenderer view={activeView} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Terminal Panel (bottom) */}
        <TerminalPanel />
      </div>

      {/* Right Artifact Panel */}
      <AnimatePresence>
        {artifactPanelOpen && <ArtifactPanel />}
      </AnimatePresence>

      {/* Floating Monitors */}
      <AgentMonitor />
      <ModelMonitor />

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#0d0d20]/90 backdrop-blur-md border-t border-border flex items-center justify-between px-3 z-40">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAgentMonitorVisible(!agentMonitorVisible)}
            className={`h-5 text-[10px] px-2 ${agentMonitorVisible ? 'text-[#00ff88]' : 'text-muted-foreground'}`}>
            <Bot className="w-3 h-3 mr-1" /> Agents
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setModelMonitorVisible(!modelMonitorVisible)}
            className={`h-5 text-[10px] px-2 ${modelMonitorVisible ? 'text-[#9d4edd]' : 'text-muted-foreground'}`}>
            <Activity className="w-3 h-3 mr-1" /> Models
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTerminalOpen(!terminalOpen)}
            className={`h-5 text-[10px] px-2 ${terminalOpen ? 'text-[#00ff88]' : 'text-muted-foreground'}`}>
            <Terminal className="w-3 h-3 mr-1" /> Terminal
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Ctrl+Shift+A Agents · Ctrl+Shift+M Models · Ctrl+` Terminal
        </div>
      </div>
    </div>
  );
}
