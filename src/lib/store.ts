// ============================================================
// Agentic OS V2 — Zustand Global Store
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewType, ChatMessage, ArtifactData, BrainOutput } from './types';

interface OSState {
  // Navigation
  activeView: ViewType;
  sidebarCollapsed: boolean;

  // Chat
  activeConversationId: string | null;
  activeWorkspaceId: string | null;
  chatMessages: ChatMessage[];
  isProcessing: boolean;
  activeBrain: number | null;
  brainOutputs: BrainOutput[];

  // Panels
  terminalOpen: boolean;
  terminalSessions: string[];
  agentMonitorVisible: boolean;
  modelMonitorVisible: boolean;
  artifactPanelOpen: boolean;
  activeArtifact: ArtifactData | null;

  // Actions
  setActiveView: (view: ViewType) => void;
  toggleSidebar: () => void;
  setActiveConversation: (id: string | null) => void;
  setActiveWorkspace: (id: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setIsProcessing: (processing: boolean) => void;
  setActiveBrain: (brain: number | null) => void;
  setBrainOutputs: (outputs: BrainOutput[]) => void;
  setTerminalOpen: (open: boolean) => void;
  addTerminalSession: (id: string) => void;
  removeTerminalSession: (id: string) => void;
  setAgentMonitorVisible: (visible: boolean) => void;
  setModelMonitorVisible: (visible: boolean) => void;
  setArtifactPanelOpen: (open: boolean) => void;
  setActiveArtifact: (artifact: ArtifactData | null) => void;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useOSStore = create<OSState>()(
  persist(
    (set) => ({
      // Navigation
      activeView: 'home',
      sidebarCollapsed: false,

      // Chat
      activeConversationId: null,
      activeWorkspaceId: null,
      chatMessages: [],
      isProcessing: false,
      activeBrain: null,
      brainOutputs: [],

      // Panels
      terminalOpen: false,
      terminalSessions: [],
      agentMonitorVisible: false,
      modelMonitorVisible: false,
      artifactPanelOpen: false,
      activeArtifact: null,

      // Actions
      setActiveView: (view) => set({ activeView: view }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
      clearChatMessages: () => set({ chatMessages: [] }),
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      setActiveBrain: (brain) => set({ activeBrain: brain }),
      setBrainOutputs: (outputs) => set({ brainOutputs: outputs }),
      setTerminalOpen: (open) => set({ terminalOpen: open }),
      addTerminalSession: (id) => set((s) => ({ terminalSessions: [...s.terminalSessions, id] })),
      removeTerminalSession: (id) => set((s) => ({ terminalSessions: s.terminalSessions.filter((t) => t !== id) })),
      setAgentMonitorVisible: (visible) => set({ agentMonitorVisible: visible }),
      setModelMonitorVisible: (visible) => set({ modelMonitorVisible: visible }),
      setArtifactPanelOpen: (open) => set({ artifactPanelOpen: open }),
      setActiveArtifact: (artifact) => set({ activeArtifact: artifact }),

      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'agentic-os-v2-store',
      partialize: (state) => ({
        activeView: state.activeView,
        sidebarCollapsed: state.sidebarCollapsed,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
