'use client';

import { useOSStore } from '@/lib/store';
import {
  Sidebar, TopBar, LayerCard, AgentStatusBar,
  SystemMonitor, LogStream, LatencyGraph, ControlRoom,
  CommandPalette, GoalsView, JournalView, MemoryView,
  HermesFeatureGrid, CompoundVisualizer, SelfLayerExplanation,
  OmiObsidianStatus, NetworkTopology, QuickStats,
} from '@/components/dashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function HomePage() {
  const {
    activeView, agents, stackLayers, controlRoomAgent,
    setControlRoomAgent, commandPaletteOpen, setCommandPaletteOpen,
  } = useOSStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if (e.key === 'Escape') { setCommandPaletteOpen(false); setControlRoomAgent(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen, setControlRoomAgent]);

  // Live log simulation
  useEffect(() => {
    const messages = [
      { agent: 'Claude', layer: 1 as const, level: 'info' as const, message: 'Reasoning pipeline routed decision to Hermes via OpenClaw' },
      { agent: 'Hermes', layer: 3 as const, level: 'success' as const, message: 'Kanban task completed: competitor-analysis-q2' },
      { agent: 'OpenClaw', layer: 2 as const, level: 'info' as const, message: 'Agent routing table refreshed — 4 agents connected' },
      { agent: 'Self Vault', layer: 4 as const, level: 'success' as const, message: 'OMI exported 47 notes to Obsidian vault today' },
      { agent: 'Hermes', layer: 3 as const, level: 'info' as const, message: 'Skill execution completed: web_search (routed by OpenClaw)' },
      { agent: 'Claude', layer: 1 as const, level: 'info' as const, message: 'Pulled 23 memory entries from vault for context-rich response' },
      { agent: 'OpenClaw', layer: 2 as const, level: 'success' as const, message: 'Session handoff: Claude (L1) → Hermes (L3) complete' },
      { agent: 'Self Vault', layer: 4 as const, level: 'info' as const, message: 'Goal progress updated: 3 goals advanced this week' },
      { agent: 'Hermes', layer: 3 as const, level: 'warn' as const, message: 'Browser pool at capacity — scheduling research for off-peak' },
      { agent: 'Claude', layer: 1 as const, level: 'success' as const, message: 'CEO layer decision: prioritize vault compounding this quarter' },
    ];
    const interval = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const now = new Date();
      useOSStore.getState().addLog({
        id: Date.now().toString(),
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        ...msg,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'mission-control':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Quick Stats */}
            <QuickStats />

            {/* Agent Status Bar */}
            <div>
              <div className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-3">Live Agents</div>
              <AgentStatusBar />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SystemMonitor />
              <NetworkTopology />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LogStream />
              <LatencyGraph />
            </div>
          </motion.div>
        );

      case 'layer-intelligence': {
        const layer = stackLayers.find(l => l.id === 'intelligence')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'layer-execution': {
        const layer = stackLayers.find(l => l.id === 'execution')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'layer-research': {
        const layer = stackLayers.find(l => l.id === 'research')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <LayerCard layer={layer} />
            <div>
              <div className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-3">Hermes Feature Registry</div>
              <HermesFeatureGrid />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LogStream />
              <LatencyGraph />
            </div>
          </motion.div>
        );
      }

      case 'layer-self': {
        const layer = stackLayers.find(l => l.id === 'self')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <LayerCard layer={layer} />
            <SelfLayerExplanation />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OmiObsidianStatus />
              <CompoundVisualizer />
            </div>
          </motion.div>
        );
      }

      case 'self-goals':
        return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><GoalsView /></motion.div>;

      case 'self-journal':
        return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><JournalView /></motion.div>;

      case 'self-memory':
        return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><MemoryView /></motion.div>;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] grid-bg noise-overlay">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
        </main>

        {/* Bottom Dock — shows all 4 layer agents */}
        <div className="h-12 flex items-center justify-center gap-2 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md">
          {agents.map((agent, i) => (
            <motion.button key={agent.id} onClick={() => setControlRoomAgent(agent.id)}
              whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.95 }} className="relative group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs border transition-all"
                style={{ background: `linear-gradient(135deg, ${agent.color}22, ${agent.color}08)`, borderColor: `${agent.color}33` }}>
                {agent.name[0]}
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a1a]"
                style={{ backgroundColor: agent.status === 'live' ? agent.color : '#8888aa' }} />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white shadow-lg flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>L{agent.layer}</span>
                  {agent.name}
                </div>
              </div>
            </motion.button>
          ))}
          <div className="w-px h-6 bg-[rgba(157,78,221,0.15)] mx-1" />
          <motion.button whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8888aa] border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.5)] transition-colors hover:text-white group relative">
            ⚙
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">Settings</div>
            </div>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {controlRoomAgent && <ControlRoom agentId={controlRoomAgent} onClose={() => setControlRoomAgent(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette />}
      </AnimatePresence>
    </div>
  );
}
