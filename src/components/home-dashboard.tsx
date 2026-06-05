'use client';

// ============================================================
// Agentic OS V2 — Home Dashboard
// ============================================================
import { useOSStore } from '@/lib/store';
import type { ViewType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Bot, Upload, Terminal, Brain, Zap, Database, Server,
  ArrowRight, Activity, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface QuickAction {
  id: ViewType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'chat', label: 'New Chat', description: 'Start an AI conversation', icon: MessageSquare, color: '#E8751A' },
  { id: 'agents', label: 'Spawn Agent', description: 'Create a specialized agent', icon: Bot, color: '#9d4edd' },
  { id: 'knowledge', label: 'Upload Document', description: 'Add to knowledge base', icon: Upload, color: '#2E86AB' },
  { id: 'terminal', label: 'Open Terminal', description: 'AI-native terminal', icon: Terminal, color: '#00ff88' },
];

export function HomeDashboard() {
  const { setActiveView, setTerminalOpen } = useOSStore();

  const handleAction = (action: QuickAction) => {
    setActiveView(action.id);
    if (action.id === 'terminal') {
      setTerminalOpen(true);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8751A] to-[#9d4edd] flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Agentic OS
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            A lightweight autonomous AI operating system with 7-brain reasoning, agent swarms, graph memory, and multi-model failover.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className="bg-card border-border cursor-pointer hover:border-[#9d4edd]/30 transition-all group"
                  onClick={() => handleAction(action)}
                >
                  <CardContent className="p-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${action.color}15`, color: action.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      {action.label}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#00ff88]" />
            <span className="text-sm font-medium text-foreground">System Status</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusCard icon={<Brain className="w-4 h-4 text-[#9d4edd]" />} label="Brain Pipeline" value="7 Stages" status="active" />
            <StatusCard icon={<Bot className="w-4 h-4 text-[#00ff88]" />} label="Agent Types" value="7 Available" status="active" />
            <StatusCard icon={<Server className="w-4 h-4 text-[#00ffff]" />} label="Model Providers" value="7 Configured" status="active" />
            <StatusCard icon={<Database className="w-4 h-4 text-[#2E86AB]" />} label="Memory Engine" value="Graph + RAG" status="active" />
          </div>
        </motion.div>

        {/* Architecture overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-[#E8751A]" />
                <span className="text-sm font-medium">Architecture</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#E8751A]/5 border border-[#E8751A]/10">
                  <div className="font-medium text-[#E8751A] mb-1">Brain Engine</div>
                  <div className="text-muted-foreground">
                    Intent → Decompose → Plan → Strategy → Verify → Optimize → Learn
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#9d4edd]/5 border border-[#9d4edd]/10">
                  <div className="font-medium text-[#9d4edd] mb-1">Agent Swarm</div>
                  <div className="text-muted-foreground">
                    Auto-forms teams: 1 agent (simple) → 3 agents (medium) → 7 agents (complex)
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/10">
                  <div className="font-medium text-[#00ff88] mb-1">Model Router</div>
                  <div className="text-muted-foreground">
                    Priority failover: OpenAI → Claude → Gemini → GLM → Mistral → Qwen → DeepSeek
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent Activity</span>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground text-center py-4">
                No recent activity. Start by chatting or spawning an agent.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, status }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'active' | 'inactive' | 'error';
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{value}</span>
          <div className={cn(
            'w-2 h-2 rounded-full',
            status === 'active' && 'bg-[#00ff88]',
            status === 'error' && 'bg-[#E6394A]',
            status === 'inactive' && 'bg-muted-foreground',
          )} />
        </div>
      </CardContent>
    </Card>
  );
}
