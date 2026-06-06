'use client';

// ============================================================
// Agentic OS V2 — App Sidebar
// ============================================================
import { useOSStore } from '@/lib/store';
import type { ViewType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Network,
  Database,
  BookOpen,
  FileCode,
  Terminal,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  Cpu,
  Shield,
  Globe,
  Code2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'brain', label: 'Brains', icon: Brain },
  { id: 'swarm', label: 'Swarm', icon: Network },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'artifacts', label: 'Artifacts', icon: FileCode },
  { id: 'editor', label: 'Code Editor', icon: Code2 },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'kernel', label: 'Kernel', icon: Cpu },
  { id: 'observability', label: 'Observability', icon: Activity },
  { id: 'healing', label: 'Self-Healing', icon: Shield },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar } = useOSStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen flex flex-col border-r border-border bg-[#0d0d20] relative z-20 shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8751A] to-[#9d4edd] flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold tracking-wider text-white"
          >
            AGENTIC OS
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setActiveView(item.id)}
                className={cn(
                  'justify-start gap-3 h-10 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground',
                  isActive && 'bg-[#E8751A]/10 text-[#E8751A] hover:text-[#E8751A] hover:bg-[#E8751A]/15'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-[#E8751A]')} />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && !sidebarCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E8751A]"
                  />
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Workspace selector placeholder */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Workspace</div>
          <div className="text-sm text-foreground bg-muted/30 rounded-lg px-3 py-2 truncate">
            Default Workspace
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </motion.aside>
  );
}
