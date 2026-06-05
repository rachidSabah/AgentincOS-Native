"use client";

import { useUIStore, useSettingsStore, useAgentStore, useSkillStore, useChatStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { ClawHubLogo, ClawHubText } from "./ClawHubLogo";
import {
  PanelLeft, Settings, Bot, Zap, ChevronDown, Check, BarChart3,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TokenDashboard } from "./TokenDashboard";

export function TopBar() {
  const { toggleSidebar, setSettingsOpen } = useUIStore();
  const { settings, updateSetting, modelGroups, fetchModels } = useSettingsStore();
  const { agents, activeAgentId, setActiveAgentId } = useAgentStore();
  const { skills, activeSkillId, setActiveSkillId } = useSkillStore();
  const { activeConversationId, getActiveConversation, updateConversation } = useChatStore();

  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [tokenDashboardOpen, setTokenDashboardOpen] = useState(false);

  const agentRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Load models from store on mount
  useEffect(() => {
    fetchModels().catch(() => {});
  }, [fetchModels]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) setAgentDropdownOpen(false);
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillDropdownOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeConversation = getActiveConversation();
  const currentModelId = activeConversation ? activeConversation.model : settings.defaultModel;

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const activeSkill = skills.find(s => s.id === activeSkillId);

  // Flatten all models to find the active model display name
  const allModels = modelGroups.flatMap(g => g.models);
  const activeModel = allModels.find(m => m.id === currentModelId);

  const handleModelChange = async (modelId: string) => {
    if (activeConversationId) {
      updateConversation(activeConversationId, { model: modelId });
      try {
        await fetch(`/api/conversations/${activeConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelId }),
        });
        toast.success(`Model updated to ${modelId} for this chat`);
      } catch {
        toast.error("Failed to save model change");
      }
    } else {
      updateSetting("defaultModel", modelId);
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultModel: modelId }),
        });
        toast.success(`Default model set to ${modelId}`);
      } catch {
        toast.error("Failed to save default model");
      }
    }
    setModelDropdownOpen(false);
  };

  return (
    <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-card/30 shrink-0">
      {/* Sidebar toggle */}
      <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Toggle sidebar (Ctrl+B)">
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-2">
        <ClawHubLogo size={22} />
        <ClawHubText className="text-sm" />
      </div>

      {/* Agent selector */}
      <div ref={agentRef} className="relative">
        <button
          onClick={() => { setAgentDropdownOpen(!agentDropdownOpen); setSkillDropdownOpen(false); setModelDropdownOpen(false); }}
          className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            activeAgent ? "border-primary/30 bg-primary/5 text-primary" : "border-border hover:border-primary/20 hover:bg-muted/30 text-muted-foreground"
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          <span className="max-w-[100px] truncate">{activeAgent?.name || "Default Agent"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {agentDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
            <div className="p-2 border-b border-border max-h-60 overflow-y-auto space-y-0.5">
              <button
                onClick={() => { setActiveAgentId(null); setAgentDropdownOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                  !activeAgentId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="font-medium">Default Assistant</span>
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { setActiveAgentId(agent.id); setAgentDropdownOpen(false); }}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                    activeAgentId === agent.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="truncate">{agent.name}</span>
                </button>
              ))}
            </div>
            <div className="p-2 bg-muted/20">
              <button
                onClick={() => { setSettingsOpen(true); setAgentDropdownOpen(false); }}
                className="w-full text-center py-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Manage Agents in Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Skill selector */}
      <div ref={skillRef} className="relative">
        <button
          onClick={() => { setSkillDropdownOpen(!skillDropdownOpen); setAgentDropdownOpen(false); setModelDropdownOpen(false); }}
          className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            activeSkill ? "border-amber-500/30 bg-amber-500/5 text-amber-500" : "border-border hover:border-amber-500/20 hover:bg-muted/30 text-muted-foreground"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="max-w-[80px] truncate">{activeSkill?.name || "No Skill"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {skillDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
            <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
              <button onClick={() => { setActiveSkillId(null); setSkillDropdownOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                  !activeSkillId ? "bg-amber-500/10 text-amber-500 font-medium" : "hover:bg-muted")}
              >
                <Zap className="h-3.5 w-3.5" /> <span className="font-medium">No Skill</span>
              </button>
              {skills.map((skill) => (
                <button key={skill.id} onClick={() => { setActiveSkillId(skill.id); setSkillDropdownOpen(false); }}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                    activeSkillId === skill.id ? "bg-amber-500/10 text-amber-500 font-medium" : "hover:bg-muted")}>
                  <Zap className="h-3.5 w-3.5" />
                  <span className="truncate">{skill.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model selector */}
      <div ref={modelRef} className="relative">
        <button
          onClick={() => { setModelDropdownOpen(!modelDropdownOpen); setAgentDropdownOpen(false); setSkillDropdownOpen(false); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="max-w-[150px] truncate">{activeModel?.name || currentModelId}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {modelDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {modelGroups.map((group) => (
                <div key={group.name} className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 border-b border-border/40">
                    {group.name}
                  </p>
                  <div className="space-y-0.5">
                    {group.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                          currentModelId === model.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold">{model.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{model.description}</p>
                        </div>
                        {currentModelId === model.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {allModels.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No models available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Token Dashboard */}
      <button
        onClick={() => setTokenDashboardOpen(true)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Token Usage Dashboard"
      >
        <BarChart3 className="h-4 w-4" />
      </button>

      {/* Settings */}
      <button onClick={() => setSettingsOpen(true)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Settings (Ctrl+,)">
        <Settings className="h-4 w-4" />
      </button>

      <TokenDashboard open={tokenDashboardOpen} onOpenChange={setTokenDashboardOpen} />
    </div>
  );
}
