'use client';

import { useOSStore } from '@/lib/store';
import {
  Sidebar, TopBar,
  SystemMonitor, LogStream, LatencyGraph, ControlRoom,
  CommandPalette, GoalsView, JournalView, MemoryView,
  HermesFeatureGrid, CompoundVisualizer, SelfLayerExplanation,
  OmiObsidianStatus, NetworkTopology, QuickStats,
  LayerCard, StackOverview, AgentHeroCards,
  HermesConnectionBanner, HermesQuickActions, useHermesDetection,
  Stack3DVisualization, LayerFlowDiagram, LayerFlowView,
} from '@/components/dashboard';
import { AgentRail, LiveWorkspace, BrainPanel } from '@/components/mission-control';
import { HermesSEOSilo } from '@/components/hermes-seo-silo';
import { SwarmIntelligence } from '@/components/swarm-intelligence';
import { CostTracker, AgentMessageBus } from '@/components/cost-tracker';
import { WorkflowBuilder, PluginManager, PromptLibrary } from '@/components/workflow-plugin-prompt';
import { SecurityScanner, WebhookManager, ReportGenerator, ModelRouter } from '@/components/security-webhook-reports';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function HomePage() {
  const {
    activeView, agents, stackLayers, controlRoomAgent,
    setControlRoomAgent, commandPaletteOpen, setCommandPaletteOpen,
  } = useOSStore();

  useHermesDetection();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if (e.key === 'Escape') { setCommandPaletteOpen(false); setControlRoomAgent(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen, setControlRoomAgent]);

  useEffect(() => {
    const messages = [
      { agent: 'Claude', layer: 4 as const, level: 'info' as const, message: 'Cognitive Reasoning pipeline active — CEO layer online' },
      { agent: 'Hermes', layer: 2 as const, level: 'success' as const, message: 'Knowledge Acquisition: skill registry synced — 2,550 skills available' },
      { agent: 'OpenClaw', layer: 3 as const, level: 'info' as const, message: 'Agent Orchestration: routing table refreshed — 4 agents connected' },
      { agent: 'Self Vault', layer: 6 as const, level: 'success' as const, message: 'Memory layer: OMI recording exported — 47 new notes today' },
      { agent: 'Hermes', layer: 5 as const, level: 'info' as const, message: 'Execution layer: Kanban task completed — competitor-analysis-q2' },
      { agent: 'Claude', layer: 1 as const, level: 'info' as const, message: 'Interaction layer: multimodal input received — voice + screenshot' },
      { agent: 'OpenClaw', layer: 7 as const, level: 'success' as const, message: 'Governance: session coordination complete — all permissions verified' },
      { agent: 'Self Vault', layer: 6 as const, level: 'info' as const, message: 'Memory layer: goal progress updated — 3 goals advanced this week' },
      { agent: 'Hermes', layer: 2 as const, level: 'warn' as const, message: 'Knowledge retrieval: browser pool at capacity — scheduling for off-peak' },
      { agent: 'Claude', layer: 4 as const, level: 'success' as const, message: 'Cognitive Reasoning: pulled 23 memory entries for context-rich response' },
    ];
    const interval = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      useOSStore.getState().addLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        ...msg,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'mission-control':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
            <div className="flex h-full">
              <AgentRail />
              <LiveWorkspace />
              <BrainPanel />
            </div>
          </motion.div>
        );

      case 'stack-overview':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#FFB627]">7-Layer Stack</span>
            </div>
            <StackOverview />
            <HermesSEOSilo />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LatencyGraph />
            </div>
          </motion.div>
        );

      case 'seo-silo':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#FFB627]">Hermes SEO Silo</span>
            </div>
            <HermesSEOSilo />
          </motion.div>
        );

      case 'layer-flow':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#FFB627]">Layer Flow</span>
            </div>
            <LayerFlowView />
          </motion.div>
        );

      // 7 Layer detail views
      case 'layer-interaction': {
        const layer = stackLayers.find(l => l.id === 'interaction')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Interaction & Perception</span>
            </div>
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'layer-knowledge': {
        const layer = stackLayers.find(l => l.id === 'knowledge')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Knowledge Acquisition</span>
            </div>
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'layer-orchestration': {
        const layer = stackLayers.find(l => l.id === 'orchestration')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Agent Orchestration</span>
            </div>
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'layer-cognition': {
        const layer = stackLayers.find(l => l.id === 'cognition')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Cognitive Reasoning</span>
            </div>
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
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Execution & Integration</span>
            </div>
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

      case 'layer-memory': {
        const layer = stackLayers.find(l => l.id === 'memory')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Memory, Learning & Context</span>
            </div>
            <LayerCard layer={layer} />
            <SelfLayerExplanation />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OmiObsidianStatus />
              <CompoundVisualizer />
            </div>
          </motion.div>
        );
      }

      case 'layer-governance': {
        const layer = stackLayers.find(l => l.id === 'governance')!;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('stack-overview')} className="hover:text-white transition-colors">Stack</button>
              <span>/</span>
              <span style={{ color: layer.color }}>Deployment, Governance & Infrastructure</span>
            </div>
            <LayerCard layer={layer} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LogStream />
            </div>
          </motion.div>
        );
      }

      case 'swarm-intelligence':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#7B2CBF]">Swarm Intelligence</span>
            </div>
            <SwarmIntelligence />
          </motion.div>
        );

      case 'message-bus':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#1B998B]">Message Bus</span>
            </div>
            <AgentMessageBus />
          </motion.div>
        );

      case 'cost-tracker':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#00ff88]">Cost Tracker</span>
            </div>
            <CostTracker />
          </motion.div>
        );

      case 'workflows':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#E8751A]">Workflows</span>
            </div>
            <WorkflowBuilder />
          </motion.div>
        );

      case 'plugins':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#2E86AB]">Plugins</span>
            </div>
            <PluginManager />
          </motion.div>
        );

      case 'prompts':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#FFB627]">Prompt Library</span>
            </div>
            <PromptLibrary />
          </motion.div>
        );

      case 'security':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#ff4444]">Security</span>
            </div>
            <SecurityScanner />
          </motion.div>
        );

      case 'webhooks':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#7B2CBF]">Webhooks</span>
            </div>
            <WebhookManager />
          </motion.div>
        );

      case 'reports':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#1B998B]">Reports</span>
            </div>
            <ReportGenerator />
          </motion.div>
        );

      case 'model-router':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa]">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <span className="text-[#E63946]">Model Router</span>
            </div>
            <ModelRouter />
          </motion.div>
        );

      case 'self-goals':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa] mb-4">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('layer-memory')} className="hover:text-white transition-colors">Memory</button>
              <span>/</span>
              <span className="text-[#2E86AB]">Goals</span>
            </div>
            <GoalsView />
          </motion.div>
        );

      case 'self-journal':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa] mb-4">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('layer-memory')} className="hover:text-white transition-colors">Memory</button>
              <span>/</span>
              <span className="text-[#7B2CBF]">Journal</span>
            </div>
            <JournalView />
          </motion.div>
        );

      case 'self-memory':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 text-[10px] text-[#8888aa] mb-4">
              <button onClick={() => useOSStore.getState().setActiveView('mission-control')} className="hover:text-white transition-colors">Mission Control</button>
              <span>/</span>
              <button onClick={() => useOSStore.getState().setActiveView('layer-memory')} className="hover:text-white transition-colors">Memory</button>
              <span>/</span>
              <span className="text-[#2E86AB]">Memory</span>
            </div>
            <MemoryView />
          </motion.div>
        );

      default:
        return null;
    }
  };

  const isMissionControl3Col = activeView === 'mission-control';

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] grid-bg noise-overlay">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isMissionControl3Col && <TopBar />}
        <main className={`flex-1 overflow-hidden ${isMissionControl3Col ? '' : 'overflow-y-auto p-6'}`} role="main" aria-label="Dashboard Content">
          <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
        </main>

        {!isMissionControl3Col && (
          <div className="h-12 flex items-center justify-center gap-2 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md" role="toolbar" aria-label="Agent Quick Access">
            {agents.map((agent) => (
              <motion.button key={agent.id} onClick={() => setControlRoomAgent(agent.id)}
                whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.95 }} className="relative group"
                aria-label={`Open ${agent.name} Control Room`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs border transition-all"
                  style={{ background: `linear-gradient(135deg, ${agent.color}22, ${agent.color}08)`, borderColor: `${agent.color}33` }}>
                  {agent.name[0]}
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a1a]"
                  style={{ backgroundColor: agent.status === 'live' ? agent.color : '#8888aa' }} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white shadow-lg flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>L{agent.layers.join(',L')}</span>
                    {agent.name}
                  </div>
                </div>
              </motion.button>
            ))}
            <div className="w-px h-6 bg-[rgba(157,78,221,0.15)] mx-1" />
            <motion.button whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8888aa] border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.5)] transition-colors hover:text-white group relative"
              aria-label="Settings">
              ⚙
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">Settings</div>
              </div>
            </motion.button>
          </div>
        )}
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
