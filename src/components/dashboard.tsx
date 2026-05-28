'use client';

import { useOSStore, type StackLayer, type Goal, type JournalEntry, type MemoryEntry } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Cpu, Network, HardDrive, Activity, Radio, Zap, ChevronDown,
  Menu, Command, Shield, Search, Target, BookOpen, Database, Mic,
  FileText, TrendingUp, Eye, Headphones, PenLine, Sparkles, Crown,
  Route, FlaskConical, Gem, ArrowRight, MessageSquare, Terminal,
  Globe, Layers, Clock, Users, Wrench, Eye as EyeIcon, Lock, Lightbulb,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

const layerIconMap: Record<string, typeof Crown> = {
  interaction: EyeIcon,
  knowledge: Search,
  orchestration: Users,
  cognition: Brain,
  execution: Wrench,
  memory: Database,
  governance: Lock,
};

/* ───────── 7-LAYER 3D STACK VISUALIZATION ───────── */
export function Stack3DVisualization() {
  const { stackLayers, setActiveView } = useOSStore();

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-base tracking-wider uppercase flex items-center gap-2">
          <Layers size={16} className="text-[#FFB627]" />
          7-Layer Agentic AI Stack
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">7 LAYERS ACTIVE</span>
      </div>

      <div className="space-y-1.5">
        {stackLayers.map((layer, i) => {
          const IconComp = layerIconMap[layer.id] || Sparkles;
          return (
            <motion.button
              key={layer.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setActiveView(`layer-${layer.id}`)}
              className="w-full group relative"
            >
              <div
                className="mx-auto rounded-lg border overflow-hidden transition-all duration-300 card-hover cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${layer.color}12, ${layer.color}05)`,
                  borderColor: `${layer.color}30`,
                }}
              >
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${layer.color}25, ${layer.color}10)`, border: `1px solid ${layer.color}35` }}>
                    <IconComp size={14} style={{ color: layer.color }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                        L{layer.number}
                      </span>
                      <span className="text-white text-xs font-semibold truncate">{layer.name}</span>
                      <span className="text-[9px] hidden sm:inline" style={{ color: `${layer.color}88` }}>— {layer.flowLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono" style={{ color: `${layer.color}aa` }}>{layer.agent}</span>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ backgroundColor: layer.color }} />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Compounding indicator */}
      <div className="mt-4 pt-3 border-t border-[rgba(157,78,221,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa]">Compounding</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-[#FFB627] font-mono font-bold">Day 30</div>
          <div className="w-20 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]"
              initial={{ width: '0%' }} animate={{ width: '72%' }} transition={{ duration: 2, ease: 'easeOut' }} />
          </div>
          <span className="text-[9px] text-[#FFB627]">72%</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── LAYER FLOW DIAGRAM ───────── */
export function LayerFlowDiagram() {
  const { stackLayers } = useOSStore();
  const flowSteps = stackLayers.map(l => ({
    label: l.flowLabel,
    icon: l.flowIcon,
    color: l.color,
    id: l.id,
    number: l.number,
  }));

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={14} className="text-[#FFB627]" /> Layer Flow
        </h3>
        <span className="text-[9px] text-[#8888aa] font-mono">INPUT → OUTPUT</span>
      </div>

      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {flowSteps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => useOSStore.getState().setActiveView(`layer-${step.id}`)}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${step.color}15, ${step.color}05)`, borderColor: `${step.color}30` }}>
                {step.icon}
              </div>
              <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: step.color }}>{step.label.toUpperCase()}</span>
              <span className="text-[7px] text-[#8888aa] font-mono">L{step.number}</span>
            </motion.div>
            {i < flowSteps.length - 1 && (
              <div className="flex items-center px-0.5">
                <div className="w-3 h-px" style={{ backgroundColor: `${step.color}40` }} />
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: step.color }}
                />
                <div className="w-3 h-px" style={{ backgroundColor: `${flowSteps[i + 1].color}40` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-3 text-[9px] text-[#8888aa]">
        <span className="font-mono" style={{ color: '#FF8C42' }}>LLM ≠ full agent system</span>
        <span>·</span>
        <span className="font-mono" style={{ color: '#7B2CBF' }}>Execution + Memory are critical</span>
        <span>·</span>
        <span className="font-mono" style={{ color: '#1B998B' }}>Governance makes AI production-ready</span>
      </div>
    </div>
  );
}

/* ───────── AGENT HERO CARDS (Front Page) ───────── */
export function AgentHeroCards() {
  const { agents, setControlRoomAgent, stackLayers } = useOSStore();

  const heroAgents = [
    {
      ...agents.find(a => a.id === 'claude')!,
      heroIcon: Crown,
      borderAccent: '#E63946',
      features: ['MCP Protocol', 'Code Execution', 'Vision Pipeline', '64K Context'],
      tagline: 'Cognition + Perception',
      layerNames: ['L1 Interaction', 'L4 Cognition'],
    },
    {
      ...agents.find(a => a.id === 'openclaw')!,
      heroIcon: Route,
      borderAccent: '#E8751A',
      features: ['Agent Routing', 'Session Mgmt', 'Policy Engine', 'Observability'],
      tagline: 'Orchestration + Governance',
      layerNames: ['L3 Orchestration', 'L7 Governance'],
    },
    {
      ...agents.find(a => a.id === 'hermes')!,
      heroIcon: FlaskConical,
      borderAccent: '#FFB627',
      features: ['2,550+ Skills', 'Browser Automation', 'API Execution', 'MCP Server'],
      tagline: 'Knowledge + Execution',
      layerNames: ['L2 Knowledge', 'L5 Execution'],
    },
    {
      ...agents.find(a => a.id === 'vault')!,
      heroIcon: Gem,
      borderAccent: '#2E86AB',
      features: ['Obsidian Vault', 'OMI Recording', 'Goal Tracking', 'Memory Search'],
      tagline: 'Memory & Context',
      layerNames: ['L6 Memory'],
    },
  ];

  return (
    <section aria-label="Agent Status Cards" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={16} className="text-[#E63946]" /> Live Agents
        </h2>
        <span className="text-[10px] text-[#8888aa] font-mono tracking-wider">{agents.filter(a => a.status === 'live').length}/{agents.length} ONLINE</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {heroAgents.map((agent, i) => {
          const IconComp = agent.heroIcon;
          return (
            <motion.article
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative rounded-2xl border overflow-hidden cursor-pointer card-hover"
              style={{
                borderColor: `${agent.borderAccent}30`,
                background: `linear-gradient(145deg, ${agent.borderAccent}08, ${agent.borderAccent}02, rgba(18,18,42,0.6))`,
              }}
              onClick={() => setControlRoomAgent(agent.id)}
            >
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${agent.borderAccent}, ${agent.borderAccent}40, transparent)` }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${agent.borderAccent}20, ${agent.borderAccent}08)`, border: `1px solid ${agent.borderAccent}30` }}>
                      <IconComp size={18} style={{ color: agent.borderAccent }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold text-sm">{agent.name}</h3>
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: `${agent.borderAccent}aa` }}>{agent.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'live' ? 'animate-pulse-glow' : ''}`}
                        style={{ backgroundColor: agent.status === 'live' ? agent.borderAccent : '#8888aa' }} />
                      {agent.status === 'live' && (
                        <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-30"
                          style={{ backgroundColor: agent.borderAccent }} />
                      )}
                    </div>
                    <span className={`text-[8px] font-bold tracking-wider ${agent.status === 'live' ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-[#ccccdd] text-[11px] leading-relaxed mb-2 line-clamp-2">{agent.description}</p>

                {/* Layer badges */}
                <div className="flex items-center gap-1 mb-3">
                  {agent.layerNames.map(ln => {
                    const layerNum = parseInt(ln.charAt(1));
                    const layerData = stackLayers.find(l => l.number === layerNum);
                    return (
                      <span key={ln} className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold tracking-wider"
                        style={{ borderColor: `${layerData?.color || agent.borderAccent}35`, color: layerData?.color || agent.borderAccent, background: `${layerData?.color || agent.borderAccent}10` }}>
                        {ln}
                      </span>
                    );
                  })}
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {agent.features.map(feat => (
                    <div key={feat} className="flex items-center gap-1 text-[9px]">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: agent.borderAccent }} />
                      <span className="text-[#aaaacc]">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-[rgba(10,10,26,0.5)] rounded-md p-1.5 text-center">
                    <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Uptime</div>
                    <div className="text-white text-[10px] font-mono font-bold">{agent.uptime}</div>
                  </div>
                  <div className="bg-[rgba(10,10,26,0.5)] rounded-md p-1.5 text-center">
                    <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Latency</div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: agent.latency > 300 ? '#ffaa00' : '#00ff88' }}>{agent.latency}ms</div>
                  </div>
                  <div className="bg-[rgba(10,10,26,0.5)] rounded-md p-1.5 text-center">
                    <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Requests</div>
                    <div className="text-white text-[10px] font-mono font-bold">{(agent.requests / 1000).toFixed(1)}K</div>
                  </div>
                </div>

                <button
                  className="w-full text-center text-[10px] py-2 rounded-lg border transition-all duration-300 group-hover:border-opacity-60 font-medium flex items-center justify-center gap-1.5"
                  style={{ color: `${agent.borderAccent}cc`, borderColor: `${agent.borderAccent}25`, background: `${agent.borderAccent}08` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${agent.borderAccent}50`; e.currentTarget.style.background = `${agent.borderAccent}15`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${agent.borderAccent}25`; e.currentTarget.style.background = `${agent.borderAccent}08`; }}
                  onClick={(e) => { e.stopPropagation(); setControlRoomAgent(agent.id); }}
                >
                  <MessageSquare size={10} /> CONTROL ROOM <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 animate-scan" style={{ background: `linear-gradient(transparent 50%, ${agent.borderAccent}05 50%)`, backgroundSize: '100% 4px' }} />
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── SEO SILO STRUCTURE (7 Layers) ───────── */
export function SEOSilo() {
  const { agents, stackLayers, setActiveView, systemMetrics } = useOSStore();

  const siloSections = stackLayers.map(layer => ({
    title: `Layer ${layer.number}: ${layer.name}`,
    description: layer.whatItDoes,
    color: layer.color,
    icon: layerIconMap[layer.id] || Sparkles,
    viewId: `layer-${layer.id}`,
    keywords: layer.keyCapabilities,
  }));

  return (
    <section aria-label="SEO Content Silo" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Layers size={16} className="text-[#FFB627]" /> 7-Layer Architecture
        </h2>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] text-[#8888aa]">
          <button onClick={() => setActiveView('mission-control')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <span className="text-[#FFB627]">Stack Architecture</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {siloSections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border overflow-hidden card-hover cursor-pointer group"
            style={{ borderColor: `${section.color}20`, background: `linear-gradient(135deg, ${section.color}06, ${section.color}02)` }}
            onClick={() => setActiveView(section.viewId)}
          >
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${section.color}, transparent)` }} />
            <div className="p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${section.color}15, ${section.color}05)`, border: `1px solid ${section.color}20` }}>
                  <section.icon size={14} style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-xs mb-0.5">{section.title}</h3>
                  <p className="text-[#aaaacc] text-[10px] leading-relaxed line-clamp-2 mb-1.5">{section.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {section.keywords.slice(0, 2).map(kw => (
                      <span key={kw} className="text-[7px] px-1 py-0.5 rounded-full border font-medium"
                        style={{ borderColor: `${section.color}25`, color: `${section.color}aa`, background: `${section.color}08` }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight size={12} className="text-[#8888aa] group-hover:text-white transition-colors flex-shrink-0 mt-1" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={14} className="text-[#8888aa]" />
          <h3 className="text-[#8888aa] text-xs font-mono uppercase tracking-wider">System Architecture Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Total Layers</div>
            <div className="text-white font-mono text-lg font-bold">7</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Active Agents</div>
            <div className="text-[#E63946] font-mono text-lg font-bold">{systemMetrics.activeAgents}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Compounding</div>
            <div className="text-[#00ff88] font-mono text-lg font-bold">Day {systemMetrics.compoundDays}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Total Skills</div>
            <div className="text-[#FFB627] font-mono text-lg font-bold">2,550+</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── SIDEBAR ───────── */
export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, agents, stackLayers } = useOSStore();
  const liveCount = agents.filter((a) => a.status === 'live').length;

  const mainNav = [
    { id: 'mission-control', label: 'Mission Control', icon: Radio },
    { id: 'stack-overview', label: 'Mission Stack', icon: Sparkles },
    { id: 'layer-flow', label: 'Layer Flow', icon: Activity },
  ];

  const layerNav = stackLayers.map(l => ({
    id: `layer-${l.id}`,
    label: `L${l.number} ${l.flowLabel}`,
    icon: layerIconMap[l.id] || Sparkles,
    layer: l.number,
    color: l.color,
  }));

  const selfItems = [
    { id: 'self-goals', label: 'Goals', icon: Target },
    { id: 'self-journal', label: 'Journal', icon: BookOpen },
    { id: 'self-memory', label: 'Memory', icon: Database },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen flex flex-col bg-[#0d0d20] border-r border-[rgba(157,78,221,0.15)] relative z-20"
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(157,78,221,0.1)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8751A] to-[#7B2CBF] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="overflow-hidden">
              <div className="text-white font-bold text-sm tracking-wider">AGENTIC OS</div>
              <div className="text-[9px] text-[#8888aa] tracking-widest uppercase">7-Layer AI Stack</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {!sidebarCollapsed && <div className="px-3 mb-2 text-[9px] text-[#8888aa] uppercase tracking-widest">Navigation</div>}
        {mainNav.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative ${
                isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
              }`}
              style={isActive ? { background: 'rgba(157,78,221,0.12)' } : {}}
            >
              {isActive && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ backgroundColor: '#9d4edd' }} />}
              <item.icon size={16} className={`flex-shrink-0 transition-colors ${isActive ? '' : 'text-[#8888aa] group-hover:text-white'}`} style={isActive ? { color: '#9d4edd' } : {}} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] font-medium truncate">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.id === 'mission-control' && !sidebarCollapsed && (
                <span className="ml-auto text-[9px] bg-[#00ffff]/20 text-[#00ffff] px-1.5 py-0.5 rounded-full font-mono">{liveCount}</span>
              )}
            </button>
          );
        })}

        <div className="pt-3">
          {!sidebarCollapsed && <div className="px-3 mb-1.5 text-[9px] text-[#8888aa] uppercase tracking-widest">7 Layers</div>}
          {layerNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 group relative ${
                  isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.06)]'
                }`}
                style={isActive ? { background: `${item.color}12` } : {}}
              >
                {isActive && <motion.div layoutId="sidebar-layer-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ backgroundColor: item.color }} />}
                <item.icon size={14} className={`flex-shrink-0 transition-colors ${isActive ? '' : 'text-[#8888aa] group-hover:text-white'}`} style={isActive ? { color: item.color } : {}} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium truncate">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          {!sidebarCollapsed && <div className="px-3 mb-1.5 text-[9px] text-[#2E86AB] uppercase tracking-widest flex items-center gap-1"><Database size={9} /> Self</div>}
          {selfItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 group ${
                  isActive ? 'bg-[rgba(46,134,171,0.12)] text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(46,134,171,0.06)]'
                }`}
              >
                <item.icon size={14} className={`flex-shrink-0 ${isActive ? 'text-[#2E86AB]' : 'text-[#8888aa] group-hover:text-[#2E86AB]'}`} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] truncate">{item.label}</motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center py-3 border-t border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white transition-colors">
        <Menu size={16} />
      </button>
    </motion.aside>
  );
}

/* ───────── TOP BAR ───────── */
export function TopBar() {
  const { setCommandPaletteOpen, systemMetrics, activeView, stackLayers } = useOSStore();
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  const viewLabels: Record<string, string> = {
    'mission-control': 'Mission Control',
    'stack-overview': '7-Layer Agentic AI Stack',
    'layer-flow': 'Layer Flow — How They Work Together',
    'layer-interaction': 'Layer 1 — Interaction & Perception',
    'layer-knowledge': 'Layer 2 — Knowledge Acquisition',
    'layer-orchestration': 'Layer 3 — Agent Orchestration',
    'layer-cognition': 'Layer 4 — Cognitive Reasoning',
    'layer-execution': 'Layer 5 — Execution & Integration',
    'layer-memory': 'Layer 6 — Memory, Learning & Context',
    'layer-governance': 'Layer 7 — Deployment, Governance & Infrastructure',
    'self-goals': 'Self — Goals',
    'self-journal': 'Self — Journal',
    'self-memory': 'Self — Memory',
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-lg tracking-wide">{viewLabels[activeView] || 'Mission Control'}</h1>
        <span className="text-[#8888aa] text-sm hidden lg:block">
          {activeView === 'mission-control' ? 'All systems operational — 7 layers active.' : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-[#8888aa] font-mono text-sm">{time} <span className="text-[10px]">LOCAL</span></div>
        <button onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-all text-sm">
          <Command size={14} /><span className="hidden sm:inline">Command</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(230,57,70,0.2)] text-[#E63946] text-sm">
          <div className="w-2 h-2 rounded-full bg-[#E63946] animate-pulse-glow" />
          <span className="hidden sm:inline">7 LAYERS</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

/* ───────── QUICK STATS ───────── */
export function QuickStats() {
  const { agents, systemMetrics } = useOSStore();
  const liveAgents = agents.filter(a => a.status === 'live').length;
  const totalRequests = agents.reduce((sum, a) => sum + a.requests, 0);

  const stats = [
    { label: 'Agents Online', value: `${liveAgents}/${agents.length}`, color: '#E63946', icon: Radio },
    { label: 'Total Requests', value: totalRequests.toLocaleString(), color: '#7B2CBF', icon: Activity },
    { label: 'Avg Latency', value: `${systemMetrics.avgLatency}ms`, color: '#00ff88', icon: Zap },
    { label: 'Vault Entries', value: systemMetrics.vaultEntries.toLocaleString(), color: '#2E86AB', icon: Database },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 card-hover"
          style={{ borderColor: `${stat.color}20`, background: `linear-gradient(135deg, ${stat.color}06, ${stat.color}02)` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon size={14} style={{ color: stat.color }} />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
          </div>
          <div className="text-white font-mono font-bold text-xl">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ───────── NETWORK TOPOLOGY ───────── */
export function NetworkTopology() {
  const { agents, stackLayers, setActiveView } = useOSStore();
  const cx = 150, cy = 120;
  const positions = [
    { x: 150, y: 40, label: 'Claude', layers: [1, 4], color: '#E63946', id: 'claude' },
    { x: 150, y: 120, label: 'OpenClaw', layers: [3, 7], color: '#E8751A', id: 'openclaw' },
    { x: 40, y: 200, label: 'Hermes', layers: [2, 5], color: '#FFB627', id: 'hermes' },
    { x: 260, y: 200, label: 'Self Vault', layers: [6], color: '#2E86AB', id: 'vault' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Network size={14} className="text-[#E8751A]" /> Network Topology
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">MESH ACTIVE</span>
      </div>
      <svg viewBox="0 0 300 240" className="w-full max-w-md mx-auto">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {positions.filter(p => p.id !== 'openclaw').map(p => (
          <line key={`line-${p.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke={p.color} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="2s" repeatCount="indefinite" />
          </line>
        ))}
        {positions.filter(p => p.id !== 'openclaw').map(p => (
          <circle key={`particle-${p.id}`} r="2" fill={p.color} opacity="0.8">
            <animateMotion dur={`${2 + Math.random() * 2}s`} repeatCount="indefinite"
              path={`M${cx},${cy} L${p.x},${p.y}`} />
          </circle>
        ))}
        {positions.map((p) => {
          const agent = agents.find(a => a.id === p.id);
          const isHub = p.id === 'openclaw';
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => setActiveView('mission-control')}>
              <circle cx={p.x} cy={p.y} r={isHub ? 28 : 22} fill={`${p.color}10`} stroke={`${p.color}30`} strokeWidth="1" />
              <circle cx={p.x} cy={p.y} r={isHub ? 20 : 16} fill={`${p.color}15`} stroke={p.color} strokeWidth="1.5" filter="url(#glow)" />
              <circle cx={p.x} cy={p.y} r={isHub ? 24 : 18} fill="none" stroke={p.color} strokeWidth="0.5" opacity="0.5">
                <animate attributeName="r" from={isHub ? 20 : 16} to={isHub ? 34 : 28} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fill={p.color} fontSize="8" fontFamily="monospace" fontWeight="bold">
                L{p.layers.join(',L')}
              </text>
              <text x={p.x} y={p.y + (isHub ? 38 : 32)} textAnchor="middle" fill="#ccccdd" fontSize="10" fontFamily="sans-serif">
                {p.label}
              </text>
              {agent?.status === 'live' && (
                <circle cx={p.x + (isHub ? 16 : 12)} cy={p.y - (isHub ? 16 : 12)} r="3" fill="#00ff88">
                  <animate attributeName="opacity" from="1" to="0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ───────── STACK PYRAMID (kept for compatibility) ───────── */
export function StackPyramid() {
  return <Stack3DVisualization />;
}

/* ───────── LAYER FLOW VIEW (inner page) ───────── */
export function LayerFlowView() {
  const { stackLayers } = useOSStore();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl tracking-wider uppercase flex items-center gap-3">
            <Activity size={20} className="text-[#FFB627]" />
            How The 7 Layers Work Together
          </h2>
        </div>
        <p className="text-[#8888aa] text-sm max-w-3xl mb-6">
          The 7-Layer Agentic AI Stack processes every request through a defined flow:
          each layer builds on the previous one, transforming raw input into governed, intelligent action.
          No single layer is sufficient on its own — the power comes from how they work together.
        </p>

        {/* Flow visualization */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-3">
          {stackLayers.map((layer, i) => {
            const IconComp = layerIconMap[layer.id] || Sparkles;
            return (
              <div key={layer.id} className="flex items-center gap-2 flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={() => useOSStore.getState().setActiveView(`layer-${layer.id}`)}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl border-2 transition-all group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, borderColor: `${layer.color}50`, boxShadow: `0 0 20px ${layer.color}20` }}>
                    {layer.icon}
                  </div>
                  <span className="text-[9px] font-mono font-bold tracking-wider text-center" style={{ color: layer.color }}>{layer.flowLabel.toUpperCase()}</span>
                  <span className="text-[8px] text-[#8888aa]">L{layer.number}</span>
                </motion.div>
                {i < stackLayers.length - 1 && (
                  <div className="flex items-center">
                    <div className="w-6 h-0.5" style={{ background: `linear-gradient(90deg, ${layer.color}60, ${stackLayers[i + 1].color}60)` }} />
                    <motion.div
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stackLayers[i + 1].color }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Layer-by-layer flow explanation */}
        <div className="space-y-3">
          {stackLayers.map((layer, i) => {
            const IconComp = layerIconMap[layer.id] || Sparkles;
            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer"
                style={{ borderColor: `${layer.color}20`, background: `${layer.color}05` }}
                onClick={() => useOSStore.getState().setActiveView(`layer-${layer.id}`)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${layer.color}15`, border: `1px solid ${layer.color}30` }}>
                  <IconComp size={14} style={{ color: layer.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                      L{layer.number} · {layer.flowLabel.toUpperCase()}
                    </span>
                    <span className="text-white text-sm font-semibold">{layer.name}</span>
                  </div>
                  <p className="text-[#ccccdd] text-xs leading-relaxed">{layer.whatItDoes} <span className="italic" style={{ color: `${layer.color}aa` }}>"{layer.quote}"</span></p>
                </div>
                <ArrowRight size={14} style={{ color: layer.color }} className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100" />
              </motion.div>
            );
          })}
        </div>

        {/* Key takeaways */}
        <div className="mt-6 pt-4 border-t border-[rgba(157,78,221,0.1)]">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-[#FFB627]" /> Key Takeaways
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg p-3 border" style={{ borderColor: '#FF8C4230', background: '#FF8C4208' }}>
              <p className="text-[#FF8C42] text-xs font-mono font-bold mb-1">LLM ≠ full agent system</p>
              <p className="text-[#aaaacc] text-[10px]">A language model alone is Layer 4. Without the other 6 layers, it can&apos;t perceive, retrieve, coordinate, act, remember, or govern.</p>
            </div>
            <div className="rounded-lg p-3 border" style={{ borderColor: '#7B2CBF30', background: '#7B2CBF08' }}>
              <p className="text-[#7B2CBF] text-xs font-mono font-bold mb-1">Execution + Memory are critical</p>
              <p className="text-[#aaaacc] text-[10px]">Without Layer 5 (Execution) and Layer 6 (Memory), an AI system can think but can&apos;t act or learn from its actions.</p>
            </div>
            <div className="rounded-lg p-3 border" style={{ borderColor: '#1B998B30', background: '#1B998B08' }}>
              <p className="text-[#1B998B] text-xs font-mono font-bold mb-1">Governance makes AI production-ready</p>
              <p className="text-[#aaaacc] text-[10px]">Layer 7 ensures safety, observability, and compliance — turning an experiment into a trustworthy system.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────── STACK OVERVIEW (inner page) ───────── */
export function StackOverview() {
  const { stackLayers, setActiveView, systemMetrics } = useOSStore();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold text-xl tracking-wider uppercase flex items-center gap-3">
            <Sparkles size={20} className="text-[#FFB627]" />
            7-Layer Agentic AI Stack
          </h2>
          <span className="text-[10px] text-[#8888aa] font-mono">7 LAYERS ACTIVE</span>
        </div>
        <p className="text-[#8888aa] text-sm max-w-3xl">
          Seven layers that transform raw input into governed, intelligent action. Input → Retrieve → Coordinate → Reason → Act → Remember → Govern.
          Each layer builds on the last, and together they create a system that compounds over time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stackLayers.map((layer, i) => {
          const IconComp = layerIconMap[layer.id] || Sparkles;
          return (
            <motion.button
              key={layer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setActiveView(`layer-${layer.id}`)}
              className="text-left group"
            >
              <div className="rounded-2xl border overflow-hidden transition-all duration-300 card-hover cursor-pointer h-full"
                style={{ borderColor: `${layer.color}25`, background: `linear-gradient(135deg, ${layer.color}08, ${layer.color}03)` }}>
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, transparent)` }} />
                <div className="p-4">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}30` }}>
                      <IconComp size={18} style={{ color: layer.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                          L{layer.number}
                        </span>
                        <span className="text-white font-semibold text-sm">{layer.name}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: `${layer.color}bb` }}>{layer.flowLabel} — {layer.agent}</p>
                    </div>
                  </div>
                  <p className="text-[#ccccdd] text-xs leading-relaxed line-clamp-3 mb-2">{layer.whatItDoes}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {layer.keyCapabilities.map(cap => (
                      <span key={cap} className="text-[7px] px-1.5 py-0.5 rounded-full border font-medium"
                        style={{ borderColor: `${layer.color}25`, color: `${layer.color}aa`, background: `${layer.color}08` }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium group-hover:gap-2 transition-all" style={{ color: `${layer.color}aa` }}>
                    View Details <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-[rgba(46,134,171,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
            <TrendingUp size={16} className="text-[#FFB627]" />
            Compounding Progress
          </h3>
          <span className="text-[10px] text-[#FFB627] font-mono">DAY {systemMetrics.compoundDays}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Vault Size</div>
            <div className="text-white font-mono text-lg font-bold">{systemMetrics.vaultSize} GB</div>
          </div>
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Entries</div>
            <div className="text-[#FFB627] font-mono text-lg font-bold">{systemMetrics.vaultEntries.toLocaleString()}</div>
          </div>
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Compounding</div>
            <div className="text-[#00ff88] font-mono text-lg font-bold">{systemMetrics.compoundDays}d</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]"
              initial={{ width: '0%' }} animate={{ width: '72%' }} transition={{ duration: 2, ease: 'easeOut' }} />
          </div>
          <span className="text-sm text-[#FFB627] font-mono font-bold">72%</span>
        </div>
        <div className="flex justify-between text-[10px] text-[#8888aa] mt-2">
          <span>Day 1 — Good</span>
          <span>Day 30 — Wild</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────── LAYER CARD (detailed — 7 layer version) ───────── */
export function LayerCard({ layer }: { layer: StackLayer }) {
  const { agents, setActiveView, setControlRoomAgent, stackLayers } = useOSStore();
  const layerAgents = agents.filter(a => a.layers.includes(layer.number));
  const IconComp = layerIconMap[layer.id] || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden card-hover"
      style={{ borderColor: `${layer.color}25`, background: `linear-gradient(135deg, ${layer.color}08, ${layer.color}03)` }}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, ${layer.color}60, transparent)` }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}30` }}>
            {layer.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                LAYER {layer.number}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${layer.color}10`, color: `${layer.color}aa` }}>
                {layer.flowLabel.toUpperCase()}
              </span>
            </div>
            <h3 className="text-white font-bold text-xl">{layer.name}</h3>
            <p className="text-sm mt-0.5" style={{ color: `${layer.color}bb` }}>{layer.role}</p>
          </div>
        </div>

        {/* What It Does */}
        <div className="mb-4">
          <h4 className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-1.5 font-bold">What It Does</h4>
          <p className="text-[#ccccdd] text-sm leading-relaxed">{layer.whatItDoes}</p>
        </div>

        {/* Key Capabilities */}
        <div className="mb-4">
          <h4 className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-2 font-bold">Key Capabilities</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {layer.keyCapabilities.map(cap => (
              <div key={cap} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: `${layer.color}08`, border: `1px solid ${layer.color}15` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="text-[#ccccdd] text-xs">{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Example */}
        <div className="mb-4 p-3 rounded-lg" style={{ background: `${layer.color}06`, border: `1px solid ${layer.color}15` }}>
          <h4 className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-1 font-bold">Example</h4>
          <p className="text-[#ccccdd] text-sm leading-relaxed italic">{layer.example}</p>
        </div>

        {/* Quote Banner */}
        <div className="mb-4 p-3 rounded-lg border-l-4" style={{ borderColor: layer.color, background: `${layer.color}08` }}>
          <p className="text-sm font-medium" style={{ color: `${layer.color}dd` }}>&ldquo;{layer.quote}&rdquo;</p>
        </div>

        {/* Assigned Agents */}
        {layerAgents.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[10px] text-[#8888aa] uppercase tracking-widest mb-2 font-bold">Assigned Agents</h4>
            <div className="flex flex-wrap gap-2">
              {layerAgents.map(agent => (
                <button key={agent.id} onClick={() => setControlRoomAgent(agent.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
                  style={{ borderColor: `${agent.color}30`, background: `${agent.color}08` }}>
                  <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: agent.color }} />
                  <span className="text-white text-xs font-medium">{agent.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: agent.color }}>L{agent.layers.join(',L')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agent metrics for primary agent */}
        {layerAgents[0] && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Uptime</div>
              <div className="text-white text-sm font-mono">{layerAgents[0].uptime}</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Latency</div>
              <div className="text-sm font-mono" style={{ color: layerAgents[0].latency > 300 ? '#ffaa00' : '#00ff88' }}>{layerAgents[0].latency}ms</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Requests</div>
              <div className="text-white text-sm font-mono">{layerAgents[0].requests.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-[#8888aa] text-xs leading-relaxed mb-4">{layer.description}</p>

        {/* CTA */}
        {layerAgents[0] && (
          <button onClick={() => setControlRoomAgent(layerAgents[0].id)}
            className="w-full text-center text-sm py-2.5 rounded-lg border transition-all duration-300 group font-medium"
            style={{ color: `${layer.color}aa`, borderColor: `${layer.color}20`, background: `${layer.color}08` }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${layer.color}40`; e.currentTarget.style.color = layer.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${layer.color}20`; e.currentTarget.style.color = `${layer.color}aa`; }}
          >
            OPEN {layerAgents[0].name.toUpperCase()} CONTROL ROOM <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ───────── AGENT STATUS BAR ───────── */
export function AgentStatusBar() {
  const { agents, setControlRoomAgent, stackLayers } = useOSStore();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1">
      {agents.map((agent) => {
        const primaryLayer = stackLayers.find(l => l.number === agent.layer);
        return (
          <motion.button key={agent.id} onClick={() => setControlRoomAgent(agent.id)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[180px] card-hover cursor-pointer group"
            style={{ borderColor: `${agent.color}20`, background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}03)` }}
          >
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${agent.status === 'live' ? 'animate-pulse-glow' : ''}`}
                style={{ backgroundColor: agent.status === 'live' ? agent.color : agent.status === 'degraded' ? '#ffaa00' : '#8888aa' }} />
              {agent.status === 'live' && <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30" style={{ backgroundColor: agent.color }} />}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>L{agent.layers.join(',L')}</span>
                <span className="text-white text-sm font-semibold">{agent.name}</span>
              </div>
              <div className="text-[#8888aa] text-[11px] mt-0.5">{agent.latency}ms · {agent.lastActive}</div>
            </div>
            <ChevronDown size={14} className="text-[#8888aa] group-hover:text-white transition-colors rotate-[-90deg]" />
          </motion.button>
        );
      })}
    </div>
  );
}

/* ───────── COMPOUND VISUALIZER ───────── */
export function CompoundVisualizer() {
  const { systemMetrics } = useOSStore();
  const days = Array.from({ length: 30 }, (_, i) => {
    const growth = Math.pow(1.08, i + 1);
    return { day: i + 1, entries: Math.round(100 * growth), quality: Math.min(100, 30 + i * 2.3) };
  });

  return (
    <div className="rounded-2xl border border-[rgba(46,134,171,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <TrendingUp size={14} className="text-[#FFB627]" />
          Compounding Curve
        </h3>
        <span className="text-[10px] text-[#FFB627] font-mono">DAY {systemMetrics.compoundDays}</span>
      </div>

      <svg viewBox="0 0 300 80" className="w-full">
        <defs>
          <linearGradient id="compound-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFB627" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFB627" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={days.map((d, i) => {
            const x = (i / (days.length - 1)) * 300;
            const y = 78 - (d.quality / 100) * 72;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none" stroke="#FFB627" strokeWidth="2"
        />
        <path
          d={days.map((d, i) => {
            const x = (i / (days.length - 1)) * 300;
            const y = 78 - (d.quality / 100) * 72;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ') + ' L 300 80 L 0 80 Z'}
          fill="url(#compound-grad)"
        />
        <circle cx={(systemMetrics.compoundDays / 30) * 300} cy={78 - (days[systemMetrics.compoundDays - 1]?.quality || 50) / 100 * 72} r="4" fill="#FFB627" />
      </svg>

      <div className="flex justify-between text-[10px] text-[#8888aa] mt-2">
        <span>Day 1 — Good</span>
        <span>Day 30 — Wild</span>
      </div>

      <div className="mt-3 pt-3 border-t border-[rgba(46,134,171,0.1)] grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Vault Size</div>
          <div className="text-white font-mono text-sm font-bold">{systemMetrics.vaultSize} GB</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Entries</div>
          <div className="text-[#FFB627] font-mono text-sm font-bold">{systemMetrics.vaultEntries.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Compounding</div>
          <div className="text-[#00ff88] font-mono text-sm font-bold">{systemMetrics.compoundDays}d</div>
        </div>
      </div>
    </div>
  );
}

/* ───────── SYSTEM MONITOR ───────── */
export function SystemMonitor() {
  const { systemMetrics } = useOSStore();
  const [anim, setAnim] = useState(systemMetrics);
  useEffect(() => {
    const i = setInterval(() => setAnim(p => ({
      ...p,
      cpu: Math.max(5, Math.min(95, p.cpu + (Math.random() - 0.5) * 8)),
      memory: Math.max(30, Math.min(90, p.memory + (Math.random() - 0.5) * 4)),
      network: Math.max(20, Math.min(95, p.network + (Math.random() - 0.5) * 6)),
      disk: Math.max(20, Math.min(80, p.disk + (Math.random() - 0.5) * 2)),
    })), 2000);
    return () => clearInterval(i);
  }, []);

  const metrics = [
    { label: 'CPU', value: Math.round(anim.cpu), icon: Cpu, color: '#E63946' },
    { label: 'Memory', value: Math.round(anim.memory), icon: HardDrive, color: '#7B2CBF' },
    { label: 'Network', value: Math.round(anim.network), icon: Network, color: '#00ff88' },
    { label: 'Disk I/O', value: Math.round(anim.disk), icon: Activity, color: '#FFB627' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={16} className="text-[#7B2CBF]" /> System Monitor
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><m.icon size={14} style={{ color: m.color }} /><span className="text-[#8888aa] text-xs">{m.label}</span></div>
              <span className="text-white text-xs font-mono font-bold">{m.value}%</span>
            </div>
            <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }}
                animate={{ width: `${m.value}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(157,78,221,0.1)] grid grid-cols-3 gap-3">
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Layers</div><div className="text-white font-mono text-sm font-bold">7</div></div>
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Requests</div><div className="text-white font-mono text-sm font-bold">{(systemMetrics.totalRequests / 1000).toFixed(1)}K</div></div>
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Avg Latency</div><div className="text-[#00ff88] font-mono text-sm font-bold">{systemMetrics.avgLatency}ms</div></div>
      </div>
    </div>
  );
}

/* ───────── LOG STREAM ───────── */
export function LogStream() {
  const { logs, stackLayers } = useOSStore();
  const levelColors: Record<string, string> = { info: '#FFB627', warn: '#ffaa00', error: '#ff0040', success: '#00ff88' };
  const layerColorMap = Object.fromEntries(stackLayers.map(l => [l.number, l.color]));

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(157,78,221,0.1)]">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={14} className="text-[#E63946]" /> Signal Log
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <span className="text-[10px] text-[#00ff88] font-mono tracking-wider">STREAMING</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
        {logs.map(log => (
          <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 py-1">
            <span className="text-[#8888aa] flex-shrink-0 w-16">{log.timestamp}</span>
            <span className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${layerColorMap[log.layer] || '#8888aa'}20`, color: layerColorMap[log.layer] || '#8888aa' }}>
              L{log.layer}
            </span>
            <span className="flex-shrink-0 w-14 uppercase text-[10px] font-bold" style={{ color: levelColors[log.level] }}>[{log.level}]</span>
            <span className="text-[#ccccdd] flex-1">{log.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── LATENCY GRAPH ───────── */
export function LatencyGraph() {
  const [data, setData] = useState<number[]>([120, 145, 132, 189, 156, 203, 178, 145, 167, 198, 156, 134, 189, 210, 176]);
  useEffect(() => {
    const i = setInterval(() => setData(p => [...p.slice(1), Math.max(50, Math.min(500, p[p.length - 1] + (Math.random() - 0.45) * 40))]), 3000);
    return () => clearInterval(i);
  }, []);

  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Zap size={14} className="text-[#FFB627]" /> Cross-Layer Latency
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">7 LAYERS</span>
      </div>
      <div className="flex items-end gap-[2px] h-20">
        {data.map((val, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{
            height: `${((val - min) / range) * 100}%`,
            minHeight: '3px',
            background: `linear-gradient(180deg, #7B2CBF, #E63946)`,
            opacity: 0.6 + ((val - min) / range) * 0.4,
          }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[#8888aa] mt-2">
        <span>~{min}ms</span>
        <span>~{max}ms</span>
      </div>
    </div>
  );
}

/* ───────── CONTROL ROOM ───────── */
export function ControlRoom({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { agents, stackLayers, hermesConnection, chatHistories, addChatMessage, clearChatHistory, isChatStreaming, setIsChatStreaming } = useOSStore();
  const agent = agents.find(a => a.id === agentId);
  const layer = stackLayers.find(l => l.number === agent?.layer);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const messages = chatHistories[agentId] || [];

  useEffect(() => {
    if (agent && layer && messages.length === 0) {
      addChatMessage(agentId, {
        id: `init-${Date.now()}`,
        role: 'agent',
        content: `${agent.name} control room initialized. Layers ${agent.layers.map(l => `L${l}`).join(', ')} — ${layer.role}. ${agentId === 'hermes' && hermesConnection.running ? 'Hermes API connected — responses are live.' : 'Ready for commands.'}`,
        timestamp: Date.now(),
        agentId,
      });
    }
  }, [agentId]);

  useEffect(() => {
    const el = document.getElementById('chat-scroll-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  if (!agent || !layer) return null;

  const isHermesLive = agentId === 'hermes' && hermesConnection.running;

  const handleSend = async () => {
    if (!input.trim() || isChatStreaming) return;
    const userMsg = input.trim();
    setInput('');

    addChatMessage(agentId, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMsg,
      timestamp: Date.now(),
      agentId,
    });

    if (isHermesLive) {
      setIsChatStreaming(true);
      setStreamingText('');
      try {
        const apiMessages = messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }));
        apiMessages.push({ role: 'user', content: userMsg });
        const res = await fetch('/api/hermes/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, stream: true }),
        });
        if (!res.ok) {
          addChatMessage(agentId, { id: `err-${Date.now()}`, role: 'system', content: `Hermes API error: ${res.status}`, timestamp: Date.now(), agentId });
          setIsChatStreaming(false);
          return;
        }
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) { fullText += delta; setStreamingText(fullText); }
                } catch {
                  if (data && data !== '[DONE]') { fullText += data; setStreamingText(fullText); }
                }
              }
            }
          }
        }
        addChatMessage(agentId, { id: `agent-${Date.now()}`, role: 'agent', content: fullText || 'No response received.', timestamp: Date.now(), agentId });
      } catch (err) {
        addChatMessage(agentId, { id: `err-${Date.now()}`, role: 'system', content: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`, timestamp: Date.now(), agentId });
      } finally {
        setStreamingText('');
        setIsChatStreaming(false);
      }
    } else {
      setTimeout(() => {
        addChatMessage(agentId, { id: `agent-${Date.now()}`, role: 'agent', content: `Command "${userMsg}" acknowledged. Processing through Layers ${agent.layers.map(l => `L${l}`).join(', ')} pipeline...`, timestamp: Date.now(), agentId });
      }, 800);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-[90vw] max-w-4xl h-[80vh] rounded-2xl border bg-[#0a0a1a] overflow-hidden flex flex-col"
        style={{ borderColor: `${layer.color}25` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${layer.color}15` }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}30` }}>
              {layer.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>L{agent.layers.join(',L')}</span>
                <h2 className="text-white font-bold text-lg">{agent.name} Control Room</h2>
                {isHermesLive && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-bold tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse-glow" />LIVE API
                  </span>
                )}
              </div>
              <p className="text-[11px]" style={{ color: `${layer.color}aa` }}>{layer.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => clearChatHistory(agentId)} className="text-[10px] px-2 py-1 rounded-lg border border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.1)] transition-colors">Clear</button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${agent.status === 'live' ? 'bg-[#00ffff]/15 text-[#00ffff]' : 'bg-[#8888aa]/15 text-[#8888aa]'}`}>{agent.status.toUpperCase()}</span>
            <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors text-xl">×</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div id="chat-scroll-container" className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                  msg.role === 'user' ? 'bg-[rgba(123,44,191,0.2)] text-white border border-[rgba(123,44,191,0.15)]'
                    : msg.role === 'system' ? 'bg-[rgba(255,170,0,0.1)] text-[#ffaa00] border border-[rgba(255,170,0,0.15)] text-xs text-center max-w-[90%]'
                    : 'bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(123,44,191,0.1)]'}`}>
                  <pre className="whitespace-pre-wrap font-sans break-words">{msg.content}</pre>
                </div>
              </motion.div>
            ))}
            {streamingText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="max-w-[70%] px-4 py-3 rounded-xl text-sm bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(0,255,136,0.2)]">
                  <pre className="whitespace-pre-wrap font-sans break-words">{streamingText}</pre>
                  <span className="inline-block w-2 h-4 bg-[#00ff88] animate-pulse-glow ml-1" />
                </div>
              </motion.div>
            )}
          </div>
          <div className="p-4 border-t border-[rgba(157,78,221,0.1)]">
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={isChatStreaming}
                placeholder={isChatStreaming ? 'Hermes is thinking...' : isHermesLive ? `Message Hermes directly (Live API)...` : `Send command to ${agent.name} (L${agent.layers.join(',L')})...`}
                className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] disabled:opacity-50" />
              <button onClick={handleSend} disabled={isChatStreaming || !input.trim()}
                className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}88)` }}>
                {isChatStreaming ? '...' : 'Send'}
              </button>
            </div>
            {isHermesLive && (
              <div className="mt-2 text-[10px] text-[#00ff88] flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse-glow" />
                Connected to Hermes API at {hermesConnection.apiEndpoint} — Model: {hermesConnection.model || 'default'}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── COMMAND PALETTE ───────── */
export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView, setControlRoomAgent, stackLayers } = useOSStore();
  const [query, setQuery] = useState('');

  const layerCommands = stackLayers.map(l => ({
    id: `l${l.number}`,
    label: `Layer ${l.number} — ${l.name}`,
    desc: l.flowLabel,
    action: () => setActiveView(`layer-${l.id}`),
  }));

  const commands = [
    { id: 'mc', label: 'Mission Control', desc: 'Main dashboard', action: () => setActiveView('mission-control') },
    { id: 'stack', label: '7-Layer Stack', desc: 'Full stack overview', action: () => setActiveView('stack-overview') },
    { id: 'flow', label: 'Layer Flow', desc: 'How layers work together', action: () => setActiveView('layer-flow') },
    ...layerCommands,
    { id: 'cr-claude', label: 'Claude Control Room', desc: 'L1,L4 agent', action: () => setControlRoomAgent('claude') },
    { id: 'cr-openclaw', label: 'OpenClaw Control Room', desc: 'L3,L7 agent', action: () => setControlRoomAgent('openclaw') },
    { id: 'cr-hermes', label: 'Hermes Control Room', desc: 'L2,L5 agent', action: () => setControlRoomAgent('hermes') },
    { id: 'cr-vault', label: 'Self Vault Control Room', desc: 'L6 agent', action: () => setControlRoomAgent('vault') },
    { id: 'goals', label: 'Self — Goals', desc: 'View goals', action: () => setActiveView('self-goals') },
    { id: 'journal', label: 'Self — Journal', desc: 'View journal', action: () => setActiveView('self-journal') },
    { id: 'memory', label: 'Self — Memory', desc: 'Search memory', action: () => setActiveView('self-memory') },
  ];
  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()));
  if (!commandPaletteOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => { setCommandPaletteOpen(false); setQuery(''); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-[90vw] max-w-lg rounded-2xl border border-[rgba(157,78,221,0.2)] bg-[#0d0d20] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.1)]">
          <Search size={16} className="text-[#8888aa]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-[#8888aa] focus:outline-none" autoFocus />
          <kbd className="text-[10px] text-[#8888aa] bg-[rgba(157,78,221,0.1)] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={() => { cmd.action(); setCommandPaletteOpen(false); setQuery(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(157,78,221,0.1)] transition-colors group">
              <Command size={14} className="text-[#7B2CBF]" />
              <div><div className="text-white text-sm">{cmd.label}</div><div className="text-[#8888aa] text-xs">{cmd.desc}</div></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-6 text-[#8888aa] text-sm">No commands found</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── SELF: GOALS VIEW ───────── */
export function GoalsView() {
  const { goals } = useOSStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Target size={20} className="text-[#E63946]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Goals</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(230,57,70,0.2)] text-[#E63946] font-mono">{goals.length} active</span>
      </div>
      <div className="grid gap-3">
        {goals.map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(230,57,70,0.1)] bg-[rgba(18,18,42,0.6)] p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] bg-[rgba(123,44,191,0.08)] font-medium">{goal.category}</span>
                <h4 className="text-white text-sm font-semibold">{goal.title}</h4>
              </div>
              <span className="text-[10px] text-[#8888aa]">{goal.timeline}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, #E6394688, #E63946)` }}
                  initial={{ width: '0%' }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.1 }} />
              </div>
              <span className="text-[#E63946] text-sm font-mono font-bold w-10 text-right">{goal.progress}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── SELF: JOURNAL VIEW ───────── */
export function JournalView() {
  const { journal } = useOSStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BookOpen size={20} className="text-[#7B2CBF]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Journal</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] font-mono">{journal.length} entries</span>
      </div>
      <div className="grid gap-3">
        {journal.map((entry, i) => (
          <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(123,44,191,0.1)] bg-[rgba(18,18,42,0.6)] p-5 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-white text-sm font-medium">{entry.date}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                entry.type === 'voice' ? 'bg-[rgba(255,170,0,0.1)] text-[#ffaa00] border border-[rgba(255,170,0,0.2)]' : 'bg-[rgba(230,57,70,0.1)] text-[#E63946] border border-[rgba(230,57,70,0.2)]'
              }`}>
                {entry.type === 'voice' ? <><Mic size={10} className="inline mr-1" />VOICE</> : <><PenLine size={10} className="inline mr-1" />TEXT</>}
              </span>
              <span className="text-[10px] text-[#8888aa]">via {entry.source}</span>
            </div>
            <p className="text-[#ccccdd] text-sm leading-relaxed">{entry.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── SELF: MEMORY VIEW ───────── */
export function MemoryView() {
  const { memories, selfSearchQuery, setSelfSearchQuery, agents } = useOSStore();
  const filtered = selfSearchQuery
    ? memories.filter(m => m.content.toLowerCase().includes(selfSearchQuery.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(selfSearchQuery.toLowerCase())))
    : memories;

  const layerColors: Record<string, string> = Object.fromEntries(agents.map(a => [a.name, a.color]));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Database size={20} className="text-[#2E86AB]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Memory</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(46,134,171,0.2)] text-[#2E86AB] font-mono">{memories.length} entries</span>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
        <input value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
          placeholder="Search memories... (tags, content, agents)"
          className="w-full bg-[rgba(18,18,42,0.6)] border border-[rgba(157,78,221,0.15)] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.3)]" />
        {selfSearchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8888aa]">{filtered.length} results</span>
        )}
      </div>
      <div className="grid gap-3">
        {filtered.map((mem, i) => (
          <motion.div key={mem.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-[rgba(46,134,171,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layerColors[mem.agent] || '#8888aa'}20`, color: layerColors[mem.agent] || '#8888aa' }}>
                {mem.agent}
              </span>
              <span className="text-[10px] text-[#8888aa]">{mem.timestamp}</span>
              <div className="flex-1" />
              {mem.tags.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] bg-[rgba(123,44,191,0.05)]">{t}</span>
              ))}
            </div>
            <p className="text-[#ccccdd] text-sm leading-relaxed">{mem.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── HERMES FEATURE GRID ───────── */
export function HermesFeatureGrid() {
  const features = [
    { title: '2,550+ Skills', desc: 'Across 11 registries in 35 categories', icon: '⚡', color: '#FFB627' },
    { title: '20+ LLM Providers', desc: 'Model-agnostic architecture', icon: '🧠', color: '#7B2CBF' },
    { title: 'MCP Server', desc: 'stdio + SSE transports', icon: '🔌', color: '#00ff88' },
    { title: 'Browser Automation', desc: 'Cloud & local Chromium/CDP', icon: '🌐', color: '#E63946' },
    { title: 'Voice & TTS', desc: '5 TTS + 6 STT providers', icon: '🎙️', color: '#FF8C42' },
    { title: '19+ Platforms', desc: 'Telegram, Discord, Slack, WhatsApp...', icon: '💬', color: '#7B2CBF' },
    { title: 'OpenAI API', desc: 'Compatible server endpoint', icon: '🔗', color: '#00ff88' },
    { title: 'IDE Integration', desc: 'VS Code, Zed, JetBrains via ACP', icon: '💻', color: '#FFB627' },
    { title: 'Kanban & DevOps', desc: 'Task lists, scheduled workflows', icon: '📋', color: '#FF8C42' },
    { title: 'Memory System', desc: '8 providers + MEMORY.md persistence', icon: '🧠', color: '#2E86AB' },
    { title: 'Coding Delegation', desc: 'Claude Code, Codex, OpenCode CLIs', icon: '⚙️', color: '#7B2CBF' },
    { title: 'Computer Use', desc: 'Full macOS desktop automation', icon: '🖥️', color: '#E63946' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {features.map((f, i) => (
        <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-[rgba(255,182,39,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover">
          <div className="text-2xl mb-2">{f.icon}</div>
          <h4 className="text-white text-sm font-semibold mb-1">{f.title}</h4>
          <p className="text-[#8888aa] text-xs">{f.desc}</p>
          <div className="mt-2 h-0.5 w-8 rounded-full" style={{ backgroundColor: f.color }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ───────── SELF LAYER EXPLANATION ───────── */
export function SelfLayerExplanation() {
  return (
    <div className="rounded-2xl border border-[rgba(46,134,171,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <Database size={18} className="text-[#2E86AB]" />
        <h3 className="text-white font-bold text-base tracking-wider uppercase">Why The Memory Layer Is The Real Unlock</h3>
      </div>
      <p className="text-[#ccccdd] text-sm leading-relaxed mb-4">
        The Memory Layer (L6) is the difference between an agent that gives <span className="text-[#8888aa]">generic answers</span> and an agent that gives advice as if it&apos;s <span className="text-[#2E86AB] font-semibold">worked at your company for two years</span>. It has three components inside Agent OS that compound over time.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Target, label: 'Goals', desc: 'Tracked with progress bars so every agent knows what you\'re working towards.', color: '#E63946' },
          { icon: BookOpen, label: 'Journal', desc: 'Voice or text entries stored in the vault every day so agents always know your current state.', color: '#7B2CBF' },
          { icon: Database, label: 'Memory', desc: 'Every chat auto-saved and searchable. Your AI never forgets a thing.', color: '#2E86AB' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: `${item.color}20`, background: `${item.color}05` }}>
            <item.icon size={18} style={{ color: item.color }} className="mb-2" />
            <h4 className="text-white text-sm font-semibold mb-1">{item.label}</h4>
            <p className="text-[#8888aa] text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(46,134,171,0.1)] flex items-center gap-3">
        <TrendingUp size={14} className="text-[#FFB627]" />
        <p className="text-[#FFB627] text-sm font-medium">Day one this is good. Day thirty this is wild. The system compounds because it knows more about you, your business and your priorities every single day.</p>
      </div>
    </div>
  );
}

/* ───────── OMI + OBSIDIAN STATUS ───────── */
export function OmiObsidianStatus() {
  const { systemMetrics } = useOSStore();
  return (
    <div className="rounded-2xl border border-[rgba(46,134,171,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Headphones size={14} className="text-[#2E86AB]" /> OMI + Obsidian
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2E86AB] animate-pulse-glow" />
          <span className="text-[10px] text-[#2E86AB] font-mono">RECORDING</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[rgba(10,10,26,0.5)] p-3 text-center">
          <Eye size={14} className="text-[#2E86AB] mx-auto mb-1" />
          <div className="text-[10px] text-[#8888aa] uppercase">Screen</div>
          <div className="text-[#00ff88] text-xs font-mono font-bold">Active</div>
        </div>
        <div className="rounded-lg bg-[rgba(10,10,26,0.5)] p-3 text-center">
          <Mic size={14} className="text-[#2E86AB] mx-auto mb-1" />
          <div className="text-[10px] text-[#8888aa] uppercase">Microphone</div>
          <div className="text-[#00ff88] text-xs font-mono font-bold">Active</div>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-[#8888aa]">Export Target</span><span className="text-white font-mono">Obsidian Vault</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Vault Size</span><span className="text-white font-mono">{systemMetrics.vaultSize} GB</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Total Entries</span><span className="text-[#2E86AB] font-mono">{systemMetrics.vaultEntries.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Notes Today</span><span className="text-[#00ff88] font-mono">47</span></div>
      </div>
    </div>
  );
}

/* ───────── HERMES AUTO-DETECTION HOOK ───────── */
export function useHermesDetection() {
  const { hermesConnection, setHermesConnection, updateAgent, addLog, addHermesLatency, setSSEConnectionStatus, setHermesSkills, setMCPServers } = useOSStore();

  const detect = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/detect');
      const data = await res.json();

      setHermesConnection({
        installed: data.installed,
        running: data.running,
        version: data.version,
        apiEndpoint: data.apiEndpoint,
        model: data.model,
        latency: data.latency,
        lastChecked: Date.now(),
      });

      if (data.latency) {
        addHermesLatency(data.latency);
      }

      if (data.running) {
        updateAgent('hermes', {
          status: 'live',
          model: data.model || 'hermes-3',
          lastActive: '0s ago',
        });
        addLog({
          id: `hermes-detect-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Hermes',
          layer: 2,
          level: 'success',
          message: `Hermes API detected and connected at ${data.apiEndpoint} — model: ${data.model || 'default'} — latency: ${data.latency}ms`,
        });

        // Fetch skills and MCP servers in parallel when connected
        Promise.all([
          fetch('/api/hermes/skills').then(r => r.json()).catch(() => null),
          fetch('/api/hermes/mcp').then(r => r.json()).catch(() => null),
          fetch('/api/hermes/status').then(r => r.json()).catch(() => null),
        ]).then(([skillsData, mcpData, statusData]) => {
          if (skillsData?.skills) {
            setHermesSkills(skillsData.skills.map((s: { name: string; description?: string; category?: string; source?: string }) => ({
              id: s.name,
              name: s.name,
              description: s.description,
              category: s.category ?? 'General',
              source: s.source === 'Built-in' ? 'builtin' : (s.source as 'builtin' | 'mcp' | 'plugin') ?? 'builtin',
            })));
            setHermesConnection({ skillCount: skillsData.total ?? skillsData.skills.length });
          }
          if (mcpData?.servers) {
            setMCPServers(mcpData.servers.map((s: { name: string; transport: string; connected: boolean }) => ({
              name: s.name,
              transport: s.transport as 'stdio' | 'http',
              connected: s.connected ?? false,
            })));
            setHermesConnection({ mcpServerCount: mcpData.connected ?? mcpData.total });
          }
          if (statusData) {
            setHermesConnection({
              activeSessions: statusData.activeSessions,
            });
          }
        });
      } else if (data.installed) {
        updateAgent('hermes', { status: 'degraded', lastActive: 'offline' });
        addLog({
          id: `hermes-detect-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'Hermes',
          layer: 2,
          level: 'warn',
          message: 'Hermes is installed but API server is not running. Start with: hermes gateway',
        });
      } else {
        updateAgent('hermes', { status: 'offline', lastActive: 'not installed' });
      }
    } catch {
      setHermesConnection({ installed: false, running: false, lastChecked: Date.now() });
    }
  }, [setHermesConnection, updateAgent, addLog, addHermesLatency, setHermesSkills, setMCPServers]);

  // Connect to SSE stream when Hermes is running
  useEffect(() => {
    if (!hermesConnection.running) return;

    const connectSSE = () => {
      setSSEConnectionStatus('connecting');
      try {
        const eventSource = new EventSource('/api/hermes/stream');

        eventSource.addEventListener('hermes:status', (e) => {
          try {
            const data = JSON.parse(e.data);
            setHermesConnection({
              running: data.online,
              model: data.model,
              activeSessions: data.activeSessions,
              skillCount: data.skillCount,
              mcpServerCount: data.mcpServers,
            });
          } catch { /* ignore parse errors */ }
        });

        eventSource.addEventListener('hermes:latency', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.latency !== undefined) {
              addHermesLatency(data.latency);
              setHermesConnection({ latency: data.latency });
            }
          } catch { /* ignore parse errors */ }
        });

        eventSource.addEventListener('ping', () => {
          // Keep-alive — no action needed
        });

        eventSource.onopen = () => {
          setSSEConnectionStatus('connected');
        };

        eventSource.onerror = () => {
          setSSEConnectionStatus('error');
          eventSource.close();
          // Reconnect after 10 seconds
          setTimeout(connectSSE, 10000);
        };

        return () => {
          eventSource.close();
          setSSEConnectionStatus('disconnected');
        };
      } catch {
        setSSEConnectionStatus('error');
      }
    };

    const cleanup = connectSSE();
    return () => {
      if (cleanup) cleanup();
    };
  }, [hermesConnection.running, setSSEConnectionStatus, setHermesConnection, addHermesLatency]);

  useEffect(() => {
    detect();
    const interval = setInterval(detect, 30000);
    return () => clearInterval(interval);
  }, [detect]);

  // Auto-measure latency every 15 seconds when connected
  useEffect(() => {
    if (!hermesConnection.running) return;
    const measureLatency = async () => {
      try {
        const start = Date.now();
        await fetch('/api/hermes/status');
        const latency = Date.now() - start;
        addHermesLatency(latency);
        setHermesConnection({ latency });
      } catch { /* ignore */ }
    };
    const interval = setInterval(measureLatency, 15000);
    return () => clearInterval(interval);
  }, [hermesConnection.running, addHermesLatency, setHermesConnection]);

  return { hermesConnection, redetect: detect };
}

/* ───────── HERMES CONNECTION BANNER ───────── */
export function HermesConnectionBanner() {
  const { hermesConnection, setControlRoomAgent } = useOSStore();

  // Latency color indicator
  const latencyColor = hermesConnection.latency
    ? hermesConnection.latency < 100 ? '#00ff88'
    : hermesConnection.latency < 500 ? '#ffaa00' : '#ff4444'
    : '#8888aa';

  if (!hermesConnection.installed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[rgba(255,170,0,0.2)] bg-[rgba(255,170,0,0.05)] p-3 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(255,170,0,0.1)] border border-[rgba(255,170,0,0.2)]">
          <FlaskConical size={16} className="text-[#ffaa00]" />
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">Hermes Not Detected</div>
          <div className="text-[#8888aa] text-xs">Install Hermes Agent to enable live AI chat (L2 Knowledge + L5 Execution).</div>
        </div>
      </motion.div>
    );
  }

  if (!hermesConnection.running) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[rgba(255,170,0,0.2)] bg-[rgba(255,170,0,0.05)] p-3 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(255,170,0,0.1)] border border-[rgba(255,170,0,0.2)]">
          <div className="w-3 h-3 rounded-full bg-[#ffaa00] animate-pulse-glow" />
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">Hermes Installed — API Offline</div>
          <div className="text-[#8888aa] text-xs">Start the API server: <code className="text-[#00ffff] bg-[rgba(0,255,255,0.1)] px-1.5 py-0.5 rounded text-[10px]">hermes gateway</code></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] p-3 flex items-center gap-3"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30 bg-[#00ff88]" />
        </div>
      </div>
      <div className="flex-1">
        <div className="text-white text-sm font-medium flex items-center gap-2">
          Hermes AI Connected
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-bold tracking-wider">LIVE</span>
          {hermesConnection.latency !== undefined && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold" style={{ color: latencyColor, backgroundColor: `${latencyColor}15` }}>
              {hermesConnection.latency}ms
            </span>
          )}
        </div>
        <div className="text-[#8888aa] text-xs flex items-center gap-1.5 flex-wrap">
          <span>API: <span className="text-[#00ff88]">{hermesConnection.apiEndpoint}</span></span>
          {hermesConnection.model && <span>· Model: <span className="text-[#00ff88]">{hermesConnection.model}</span></span>}
          {hermesConnection.version && <span>· v<span className="text-[#00ff88]">{hermesConnection.version}</span></span>}
          {hermesConnection.skillCount !== undefined && <span>· Skills: <span className="text-[#FFB627]">{hermesConnection.skillCount}</span></span>}
          {hermesConnection.activeSessions !== undefined && <span>· Sessions: <span className="text-[#00ff88]">{hermesConnection.activeSessions}</span></span>}
          {hermesConnection.mcpServerCount !== undefined && <span>· MCP: <span className="text-[#7B2CBF]">{hermesConnection.mcpServerCount}</span></span>}
        </div>
      </div>
      <button onClick={() => setControlRoomAgent('hermes')}
        className="px-4 py-2 rounded-lg text-xs font-medium border border-[rgba(0,255,136,0.3)] text-[#00ff88] bg-[rgba(0,255,136,0.1)] hover:bg-[rgba(0,255,136,0.2)] transition-colors flex items-center gap-1.5">
        <MessageSquare size={12} /> Chat
      </button>
    </motion.div>
  );
}

/* ───────── HERMES QUICK ACTIONS ───────── */
export function HermesQuickActions() {
  const { hermesConnection, hermesSkills, addSkillExecution, addLog, addKanbanTask } = useOSStore();

  if (!hermesConnection.running) return null;

  const executeSkill = async (skillName: string) => {
    const executionId = `exec-${Date.now()}`;
    addSkillExecution({
      id: executionId,
      skill: skillName,
      status: 'running',
      startedAt: Date.now(),
    });
    addLog({
      id: `skill-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      agent: 'Hermes',
      layer: 5,
      level: 'info',
      message: `Executing skill: ${skillName}`,
    });
    try {
      const res = await fetch('/api/hermes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skillName, stream: false }),
      });
      const data = await res.json();
      addSkillExecution({
        id: executionId,
        skill: skillName,
        status: data.success ? 'completed' : 'failed',
        result: data.result ?? data.error,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    } catch {
      addSkillExecution({
        id: executionId,
        skill: skillName,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    }
  };

  const createKanbanTask = async () => {
    try {
      const res = await fetch('/api/hermes/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New task from Hermes', priority: 'medium', assignedTo: 'hermes' }),
      });
      const data = await res.json();
      if (data.task) {
        addKanbanTask(data.task);
      }
    } catch { /* ignore */ }
  };

  const runResearch = async () => {
    await executeSkill('web-search');
  };

  const topSkills = hermesSkills.slice(0, 5);

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={runResearch}
        className="text-[9px] px-2.5 py-1.5 rounded-lg border border-[rgba(255,182,39,0.2)] text-[#FFB627] bg-[rgba(255,182,39,0.05)] hover:bg-[rgba(255,182,39,0.1)] transition-colors flex items-center gap-1"
      >
        <Search size={9} /> Run Research
      </button>
      <button
        onClick={createKanbanTask}
        className="text-[9px] px-2.5 py-1.5 rounded-lg border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] bg-[rgba(123,44,191,0.05)] hover:bg-[rgba(123,44,191,0.1)] transition-colors flex items-center gap-1"
      >
        <Target size={9} /> Create Task
      </button>
      {topSkills.map((skill) => (
        <button
          key={skill.id}
          onClick={() => executeSkill(skill.name)}
          className="text-[9px] px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors flex items-center gap-1"
        >
          <Zap size={9} /> {skill.name}
        </button>
      ))}
    </div>
  );
}
