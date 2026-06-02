'use client';

import { useOSStore, useHydration } from '@/lib/store';
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
import {
  MemoryEngineDashboard, MemoryGraph, MemoryTimeline,
  MemorySearch, MemoryExtractor, AgentMemorySharing,
  RelationshipEngine, MemoryDetail,
} from '@/components/memory-engine';
import { HomeDashboard } from '@/components/home-dashboard';
import { GeminiPowerPanel } from '@/components/gemini-power-panel';
import { AgentObservability } from '@/components/agent-observability';
import { UpdatesTab } from '@/components/updates-tab';
import { KnowledgeGap } from '@/components/knowledge-gap';
import { MemoryDecay } from '@/components/memory-decay';
import { AgentLeaderboard } from '@/components/agent-leaderboard';
import { VoiceInterface } from '@/components/voice-interface';
import { DreamMode } from '@/components/dream-mode';
import { AgentConsensus } from '@/components/agent-consensus';
import { AgentHandoff } from '@/components/agent-handoff';
import { MemoryConflict } from '@/components/memory-conflict';
import { AuditTrail } from '@/components/audit-trail';
import { PermissionScopes } from '@/components/permission-scopes';
import { MCPRegistry } from '@/components/mcp-registry';
import { SandboxExecution } from '@/components/sandbox-execution';
import { FocusMode } from '@/components/focus-mode';
import { CrossSessionMemory } from '@/components/cross-session-memory';
import { RAGEngine } from '@/components/rag-engine';
import { ProductivityHeatmap } from '@/components/productivity-heatmap';
import { WorkspaceManager } from '@/components/workspace-manager';
import { AgentMarketplace } from '@/components/agent-marketplace';
import { SettingsPanel } from '@/components/settings-panel';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, Component } from 'react';

// ─── View Error Boundary ───
type ViewErrorBoundaryState = { hasError: boolean; error?: Error };
class ViewErrorBoundary extends Component<{ children: React.ReactNode }, ViewErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidUpdate(prevProps: { children: React.ReactNode }) {
    // Reset error when children change (view switch)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="rounded-xl border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)] p-8 text-center max-w-md">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-white text-lg font-medium mb-2">View Rendering Error</div>
            <div className="text-[#8888aa] text-sm mb-1">{this.state.error?.message || 'An unexpected error occurred'}</div>
            <div className="text-[#8888aa] text-xs mb-4">Try navigating to a different view or refreshing the page.</div>
            <button onClick={() => this.setState({ hasError: false, error: undefined })} className="px-4 py-2 rounded-lg border border-[rgba(157,78,221,0.3)] text-[#9d4edd] text-sm hover:bg-[rgba(157,78,221,0.1)]">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function HydrationGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useHydration();
  useEffect(() => {
    // Trigger rehydration on mount
    useOSStore.persist.rehydrate();
  }, []);
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8751A] to-[#7B2CBF] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div className="text-white font-bold text-sm tracking-wider">AGENTIC OS</div>
          <div className="text-[#8888aa] text-xs mt-2">Initializing system...</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function HomePage() {
  const {
    activeView, agents, stackLayers, controlRoomAgent,
    setControlRoomAgent, commandPaletteOpen, setCommandPaletteOpen,
  } = useOSStore();

  useHermesDetection();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if (e.key === 'Escape') { setCommandPaletteOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  const renderView = () => {
    switch (activeView) {
      // ─── Home Dashboard ───
      case 'home':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
            <HomeDashboard />
          </motion.div>
        );

      // ─── Mission Control ───
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

      // ─── Stack Overview ───
      case 'stack-overview':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <StackOverview />
            <HermesSEOSilo />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemMonitor />
              <LatencyGraph />
            </div>
          </motion.div>
        );

      // ─── SEO Silo ───
      case 'seo-silo':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <HermesSEOSilo />
          </motion.div>
        );

      // ─── Layer Flow ───
      case 'layer-flow':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <LayerFlowView />
          </motion.div>
        );

      // ─── Memory Engine Views ───
      case 'memory-engine':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryEngineDashboard />
          </motion.div>
        );

      case 'memory-graph':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryGraph />
          </motion.div>
        );

      case 'memory-timeline':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryTimeline />
          </motion.div>
        );

      case 'memory-search':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemorySearch />
          </motion.div>
        );

      case 'memory-extractor':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryExtractor />
          </motion.div>
        );

      case 'agent-sharing':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentMemorySharing />
          </motion.div>
        );

      case 'relationship-engine':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <RelationshipEngine />
          </motion.div>
        );

      // ─── Agent Observability ───
      case 'observability':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
            <AgentObservability />
          </motion.div>
        );

      // ─── 7 Layer detail views ───
      case 'layer-interaction': {
        const layer = stackLayers.find(l => l.id === 'interaction');
        if (!layer) return null;
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

      case 'layer-knowledge': {
        const layer = stackLayers.find(l => l.id === 'knowledge');
        if (!layer) return null;
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

      case 'layer-orchestration': {
        const layer = stackLayers.find(l => l.id === 'orchestration');
        if (!layer) return null;
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

      case 'layer-cognition': {
        const layer = stackLayers.find(l => l.id === 'cognition');
        if (!layer) return null;
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
        const layer = stackLayers.find(l => l.id === 'execution');
        if (!layer) return null;
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

      case 'layer-memory': {
        const layer = stackLayers.find(l => l.id === 'memory');
        if (!layer) return null;
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

      case 'layer-governance': {
        const layer = stackLayers.find(l => l.id === 'governance');
        if (!layer) return null;
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

      // ─── Power Features ───
      case 'swarm-intelligence':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SwarmIntelligence />
          </motion.div>
        );

      case 'message-bus':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentMessageBus />
          </motion.div>
        );

      case 'cost-tracker':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <CostTracker />
          </motion.div>
        );

      case 'workflows':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <WorkflowBuilder />
          </motion.div>
        );

      case 'model-router':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <ModelRouter />
          </motion.div>
        );

      // ─── Premium Components ───
      case 'knowledge-gap':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <KnowledgeGap />
          </motion.div>
        );

      case 'memory-decay':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryDecay />
          </motion.div>
        );

      case 'agent-leaderboard':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentLeaderboard />
          </motion.div>
        );

      case 'voice-interface':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <VoiceInterface />
          </motion.div>
        );

      // ─── Premium OS Components ───
      case 'dream-mode':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <DreamMode />
          </motion.div>
        );

      case 'agent-consensus':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentConsensus />
          </motion.div>
        );

      case 'agent-handoff':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentHandoff />
          </motion.div>
        );

      case 'memory-conflict':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MemoryConflict />
          </motion.div>
        );

      // ─── Cyberpunk Premium Components ───
      case 'audit-trail':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AuditTrail />
          </motion.div>
        );

      case 'permission-scopes':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <PermissionScopes />
          </motion.div>
        );

      case 'mcp-registry':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <MCPRegistry />
          </motion.div>
        );

      case 'sandbox-execution':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SandboxExecution />
          </motion.div>
        );

      // ─── Gemini CLI Panel ───
      case 'gemini-panel':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <GeminiPowerPanel />
          </motion.div>
        );

      // ─── Cyberpunk Premium Components v2 ───
      case 'focus-mode':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <FocusMode />
          </motion.div>
        );

      case 'cross-session-memory':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <CrossSessionMemory />
          </motion.div>
        );

      case 'rag-engine':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <RAGEngine />
          </motion.div>
        );

      case 'productivity-heatmap':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <ProductivityHeatmap />
          </motion.div>
        );

      // ─── Extensions ───
      case 'plugins':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <PluginManager />
          </motion.div>
        );

      case 'prompts':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <PromptLibrary />
          </motion.div>
        );

      case 'webhooks':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <WebhookManager />
          </motion.div>
        );

      case 'security':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SecurityScanner />
          </motion.div>
        );

      case 'reports':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <ReportGenerator />
          </motion.div>
        );

      // ─── Workspace Manager ───
      case 'workspace-manager':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <WorkspaceManager />
          </motion.div>
        );

      // ─── Agent Marketplace ───
      case 'agent-marketplace':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AgentMarketplace />
          </motion.div>
        );

      // ─── Settings ───
      case 'settings':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SettingsPanel />
          </motion.div>
        );

      // ─── Updates ───
      case 'updates':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
            <UpdatesTab />
          </motion.div>
        );

      // ─── Self ───
      case 'self-goals':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GoalsView />
          </motion.div>
        );

      case 'self-journal':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <JournalView />
          </motion.div>
        );

      case 'self-memory':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MemoryView />
          </motion.div>
        );

      default:
        return null;
    }
  };

  const isMissionControl3Col = activeView === 'mission-control';
  const isHomeView = activeView === 'home' || activeView === 'observability' || activeView === 'updates';

  return (
    <HydrationGuard>
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] grid-bg noise-overlay">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isMissionControl3Col && !isHomeView && <TopBar />}
        <main className={`flex-1 overflow-hidden ${isMissionControl3Col || isHomeView ? '' : 'overflow-y-auto p-6'}`} role="main" aria-label="Dashboard Content">
          <ViewErrorBoundary>
            <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
          </ViewErrorBoundary>
        </main>

        {!isMissionControl3Col && !isHomeView && (
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
              onClick={() => useOSStore.getState().setActiveView('settings')}
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
    </HydrationGuard>
  );
}
