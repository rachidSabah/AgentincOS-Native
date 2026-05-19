"use client";

import { useEffect, useCallback, useState } from "react";
import { useTheme } from "next-themes";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PromptSidebar } from "@/components/PromptSidebar";
import { TopBar } from "@/components/TopBar";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { useChatStore, useSettingsStore, useUIStore, useAgentStore, useSkillStore, usePromptStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { X, MessageSquare } from "lucide-react";

function DashboardContent() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem("clawhub_onboarded");
    if (onboarded !== "true") {
      setShowOnboarding(true);
    }
  }, []);
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    setConversations,
    setMessages,
    removeConversation,
  } = useChatStore();
  const { setAgents } = useAgentStore();
  const { setSkills } = useSkillStore();
  const { setPrompts } = usePromptStore();
  const { settings, setSettings } = useSettingsStore();
  const { sidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          if (data.theme && data.theme !== "system") {
            setTheme(data.theme);
          }
        }
      } catch {}
    };
    loadSettings();
  }, [setSettings, setTheme]);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch(`/api/conversations?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch {}
    };
    loadConversations();
  }, [setConversations]);

  // Load agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch(`/api/agents?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setAgents(data);
        }
      } catch {}
    };
    loadAgents();
  }, [setAgents]);

  // Load skills on mount
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const res = await fetch(`/api/skills?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setSkills(data);
        }
      } catch {}
    };
    loadSkills();
  }, [setSkills]);

  // Load prompts on mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const res = await fetch(`/api/prompts?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setPrompts(data);
        }
      } catch {}
    };
    loadPrompts();
  }, [setPrompts]);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  }, [activeConversationId, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setActiveConversationId(null);
        // Focus the input
        setTimeout(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>("textarea.chat-input");
          textarea?.focus();
        }, 100);
      }
      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
      // Cmd/Ctrl + ,: Open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        useUIStore.getState().setSettingsOpen(true);
      }
      // Escape: Close settings
      if (e.key === "Escape") {
        useUIStore.getState().setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveConversationId]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-[320px]" : "w-0"
        )}
      >
        <div className="w-[320px] h-full">
          <ChatSidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        {/* Horizontal Scrolling Chat Tabs */}
        {conversations.length > 0 && (
          <div className="border-b border-border bg-card/25 flex items-center h-11 px-4 gap-2 overflow-x-auto scrollbar-none shrink-0 shadow-sm">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 shrink-0 select-none border border-transparent",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary/20 shadow-sm"
                      : "bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/10"
                  )}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <MessageSquare className="h-3 w-3 opacity-70" />
                  <span className="truncate max-w-[120px] font-semibold">{conv.title}</span>
                  <span
                    className={cn(
                      "hover:bg-black/10 rounded-full p-0.5 ml-1 transition-colors",
                      isActive ? "hover:bg-white/20" : "hover:bg-muted/60"
                    )}
                    onClick={async (e) => {
                      e.stopPropagation();
                      removeConversation(conv.id);
                      // Also delete from DB so it doesn't reappear on page refresh
                      try {
                        await fetch(`/api/conversations/${conv.id}`, { method: "DELETE" });
                      } catch {}
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <ChatWindow />
        <ChatInput />
      </div>

      {/* Prompt Sidebar */}
      <div className="shrink-0 hidden xl:block h-full">
        <PromptSidebar />
      </div>

      {/* Settings Dialog */}
      <SettingsPanel />

      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardContent />
  );
}
