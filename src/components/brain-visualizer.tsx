'use client';

// ============================================================
// Agentic OS V2 — Brain Visualizer (Inline)
// ============================================================
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { BrainID } from '@/lib/types';
import { Brain, Target, ListTree, Route, ShieldCheck, Gauge, GraduationCap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface BrainStep {
  id: BrainID;
  name: string;
  icon: React.ElementType;
  description: string;
}

const BRAIN_STEPS: BrainStep[] = [
  { id: 1, name: 'Intent', icon: Target, description: 'Analyzes user intent' },
  { id: 2, name: 'Decompose', icon: ListTree, description: 'Breaks into tasks' },
  { id: 3, name: 'Plan', icon: Route, description: 'Creates execution plan' },
  { id: 4, name: 'Strategy', icon: Brain, description: 'Determines tools & agents' },
  { id: 5, name: 'Verify', icon: ShieldCheck, description: 'Validates feasibility' },
  { id: 6, name: 'Optimize', icon: Gauge, description: 'Optimizes execution' },
  { id: 7, name: 'Learn', icon: GraduationCap, description: 'Records outcomes' },
];

export function BrainVisualizer() {
  const { activeBrain, brainOutputs, isProcessing } = useOSStore();
  const [hoveredBrain, setHoveredBrain] = useState<BrainID | null>(null);

  const getBrainStatus = (id: BrainID): 'pending' | 'active' | 'completed' => {
    if (activeBrain === id) return 'active';
    const outputIndex = id - 1;
    if (brainOutputs[outputIndex]?.success) return 'completed';
    if (isProcessing && activeBrain !== null && id < activeBrain) return 'completed';
    if (!isProcessing && brainOutputs.length > 0 && brainOutputs[outputIndex]?.success) return 'completed';
    return 'pending';
  };

  return (
    <div className="border-b border-border bg-[#0d0d20]/50 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-1 overflow-x-auto">
          {BRAIN_STEPS.map((step, i) => {
            const status = getBrainStatus(step.id);
            const Icon = step.icon;
            const isActive = status === 'active';
            const isCompleted = status === 'completed';

            return (
              <div key={step.id} className="flex items-center">
                <motion.div
                  onMouseEnter={() => setHoveredBrain(step.id)}
                  onMouseLeave={() => setHoveredBrain(null)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-default relative',
                    isActive && 'bg-[#E8751A]/15 border border-[#E8751A]/30 text-[#E8751A]',
                    isCompleted && 'bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88]',
                    !isActive && !isCompleted && 'bg-muted/20 border border-border text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className={cn('w-3.5 h-3.5', isActive && 'animate-pulse')} />
                  )}
                  <span className="whitespace-nowrap">{step.name}</span>

                  {/* Tooltip */}
                  {hoveredBrain === step.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-[#1a1a3e] border border-border text-[10px] text-foreground whitespace-nowrap shadow-lg z-10"
                    >
                      {step.description}
                      {brainOutputs[step.id - 1] && (
                        <div className="text-muted-foreground mt-0.5">
                          {brainOutputs[step.id - 1].durationMs}ms
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>

                {i < BRAIN_STEPS.length - 1 && (
                  <div className={cn(
                    'w-4 h-px mx-0.5',
                    isCompleted ? 'bg-[#00ff88]/40' : 'bg-border'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
