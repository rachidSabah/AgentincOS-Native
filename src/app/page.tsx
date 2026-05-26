'use client';

import { useOSStore } from '@/lib/store';
import {
  Sidebar,
  TopBar,
  AgentStatusBar,
  AgentCard,
  SystemMonitor,
  LogStream,
  LatencyGraph,
  ControlRoom,
  CommandPalette,
  SelfView,
  HermesFeatureGrid,
  NetworkTopology,
  CloudView,
} from '@/components/dashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function HomePage() {
  const {
    activeView,
    agents,
    controlRoomAgent,
    setControlRoomAgent,
    commandPaletteOpen,
    setCommandPaletteOpen,
  } = useOSStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setControlRoomAgent(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen, setControlRoomAgent]);

  // Simulate live log updates
  useEffect(() => {
    const messages = [
      { agent: 'Claude', level: 'info' as const, message: 'Vision pipeline frame processed' },
      { agent: 'Hermes', level: 'success' as const, message: 'Skill execution completed: web_search' },
      { agent: 'OpenClaw', level: 'info' as const, message: 'Gateway heartbeat ACK received' },
      { agent: 'System', level: 'info' as const, message: 'Memory checkpoint saved' },
      { agent: 'Hermes', level: 'info' as const, message: 'Browser automation task completed' },
      { agent: 'Claude', level: 'success' as const, message: 'MCMC iteration completed' },
      { agent: 'OpenClaw', level: 'info' as const, message: 'New agent session initialized' },
      { agent: 'Hermes', level: 'warn' as const, message: 'TTS provider latency spike detected' },
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Agent Status Bar */}
            <div>
              <div className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-3">Live Agent Status</div>
              <AgentStatusBar />
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>

            {/* Bottom Row: System Monitor, Log Stream, Latency Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SystemMonitor />
              <LogStream />
              <div className="space-y-4">
                <LatencyGraph />
                <NetworkTopology />
              </div>
            </div>
          </motion.div>
        );

      case 'agents':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-xl uppercase tracking-wider">All Agents</h2>
              <span className="text-[10px] text-[#8888aa] font-mono">
                {agents.length} registered · {agents.filter((a) => a.status === 'live').length} live
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </motion.div>
        );

      case 'openclaw':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9d4edd]/30 to-[#9d4edd]/10 border border-[#9d4edd]/30 flex items-center justify-center text-white font-bold">
                O
              </div>
              <div>
                <h2 className="text-white font-bold text-xl uppercase tracking-wider">OpenClaw</h2>
                <p className="text-[#8888aa] text-sm">Local agent gateway. Chat one-on-one or open the control room.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AgentCard agent={agents.find((a) => a.id === 'openclaw')!} />
              <SystemMonitor />
            </div>

            <LogStream />
          </motion.div>
        );

      case 'hermes':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9d4edd]/30 to-[#9d4edd]/10 border border-[#9d4edd]/30 flex items-center justify-center text-white font-bold">
                H
              </div>
              <div>
                <h2 className="text-white font-bold text-xl uppercase tracking-wider">Hermes Agent</h2>
                <p className="text-[#8888aa] text-sm">
                  The self-improving AI agent by Nous Research. 2,550+ skills, 20+ LLM providers, model-agnostic.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <AgentCard agent={agents.find((a) => a.id === 'hermes')!} />
              </div>
              <SystemMonitor />
            </div>

            {/* Hermes Features */}
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

      case 'cloud':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <CloudView />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <NetworkTopology />
            </div>
          </motion.div>
        );

      case 'goals':
      case 'journal':
      case 'memory':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SelfView type={activeView as 'goals' | 'journal' | 'memory'} />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] grid-bg noise-overlay">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
        </main>

        {/* Bottom Dock */}
        <div className="h-12 flex items-center justify-center gap-2 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md">
          {agents.map((agent) => (
            <motion.button
              key={agent.id}
              onClick={() => setControlRoomAgent(agent.id)}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs border transition-all"
                style={{
                  background: `linear-gradient(135deg, ${agent.color}22, ${agent.color}08)`,
                  borderColor: `${agent.color}33`,
                }}
              >
                {agent.name[0]}
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a1a]"
                style={{
                  backgroundColor: agent.status === 'live' ? '#00ffff' : agent.status === 'degraded' ? '#ffaa00' : '#8888aa',
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">
                  {agent.name}
                </div>
              </div>
            </motion.button>
          ))}
          {/* Separator */}
          <div className="w-px h-6 bg-[rgba(157,78,221,0.15)] mx-1" />
          {/* System dock icon */}
          <motion.button
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8888aa] border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.5)] transition-colors hover:text-white group relative"
          >
            ⚙
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">
                Settings
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {controlRoomAgent && (
          <ControlRoom agentId={controlRoomAgent} onClose={() => setControlRoomAgent(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette />}
      </AnimatePresence>
    </div>
  );
}
