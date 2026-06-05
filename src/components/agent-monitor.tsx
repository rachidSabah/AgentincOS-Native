'use client';

// ============================================================
// Agentic OS V2 — Agent Monitor (Floating Panel)
// ============================================================
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { AgentType } from '@/lib/types';
import { Bot, X, Plus, Zap, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'active' | 'error';
  currentTask?: string;
}

const AGENT_COLORS: Record<AgentType, string> = {
  planner: '#FFB627',
  architect: '#00ffff',
  researcher: '#2E86AB',
  coder: '#00ff88',
  reviewer: '#9d4edd',
  verifier: '#E8751A',
  memory: '#1B998B',
};

export function AgentMonitor() {
  const { agentMonitorVisible, setAgentMonitorVisible } = useOSStore();
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json() as { agents: AgentInfo[] };
      setAgents(data.agents ?? []);
    } catch {
      setAgents([
        { id: '1', name: 'Planner', type: 'planner', status: 'idle' },
        { id: '2', name: 'Coder', type: 'coder', status: 'idle' },
        { id: '3', name: 'Reviewer', type: 'reviewer', status: 'idle' },
      ]);
    }
  };

  useEffect(() => {
    if (agentMonitorVisible) {
      const load = async () => { await loadAgents(); };
      load();
      const interval = setInterval(() => { load(); }, 5000);
      return () => clearInterval(interval);
    }
  }, [agentMonitorVisible]);

  const spawnAgent = async (type: AgentType) => {
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      void loadAgents();
    } catch {
      // Silently fail
    }
  };

  if (!agentMonitorVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-2 right-2 w-72 bg-[#12122a]/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#00ff88]" />
            <span className="text-xs font-medium text-foreground">Agent Monitor</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {agents.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAgentMonitorVisible(false)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Agent list */}
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${AGENT_COLORS[agent.type]}20`, color: AGENT_COLORS[agent.type] }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{agent.name}</div>
                  {agent.currentTask && (
                    <div className="text-[10px] text-muted-foreground truncate">{agent.currentTask}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {agent.status === 'active' && <Zap className="w-3 h-3 text-[#00ff88] animate-pulse" />}
                  {agent.status === 'error' && <AlertCircle className="w-3 h-3 text-[#E6394A]" />}
                  {agent.status === 'idle' && <Clock className="w-3 h-3 text-muted-foreground" />}
                </div>
                {/* Mini progress bar */}
                <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: agent.status === 'active' ? '60%' : agent.status === 'idle' ? '0%' : '100%',
                      backgroundColor: agent.status === 'active' ? '#00ff88' : agent.status === 'error' ? '#E6394A' : '#8888aa',
                    }}
                  />
                </div>
              </div>
            ))}

            {agents.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No agents active
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Spawn button */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex gap-1 flex-wrap">
            {(['planner', 'coder', 'reviewer'] as AgentType[]).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => spawnAgent(type)}
                className="h-6 text-[10px] px-2"
                style={{ borderColor: `${AGENT_COLORS[type]}30`, color: AGENT_COLORS[type] }}
              >
                <Plus className="w-2.5 h-2.5 mr-1" />
                {type}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
