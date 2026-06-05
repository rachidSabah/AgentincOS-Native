"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, RotateCcw, Key, Palette, MessageSquare, Sparkles, Plus, Trash2, ExternalLink, ShieldCheck, Server, Users, UserPlus, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Provider, Agent } from "@/lib/types";
import { useAgentStore, useUIStore, useSettingsStore } from "@/lib/stores";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const KNOWN_PROVIDERS = [
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com" },
  { name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  { name: "Novita AI", baseUrl: "https://api.novita.ai/v1" },
  { name: "Hugging Face", baseUrl: "https://api-inference.huggingface.co/v1" },
  { name: "Kimi / Moonshot", baseUrl: "https://api.moonshot.cn/v1" },
  { name: "Alibaba / DashScope", baseUrl: "https://dashscope.aliyuncs.com/api/v1" },
  { name: "MiniMax", baseUrl: "https://api.minimax.chat/v1" },
  { name: "z.ai / GLM", baseUrl: "https://api.z.ai/v1" },
  { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { name: "Perplexity", baseUrl: "https://api.perplexity.ai" },
];

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useUIStore();
  const { settings, updateSetting, setSettings, modelGroups, fetchModels } = useSettingsStore();
  const { agents, addAgent, updateAgent, removeAgent, setAgents } = useAgentStore();
  const { theme, setTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState(settings);
  const [providers, setProviders] = useState<Provider[]>([]);
  
  const availableModels = modelGroups.flatMap(g => g.models);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState({ name: "", baseUrl: "", apiKey: "" });
  const [isDetectingModels, setIsDetectingModels] = useState(false);
  const [detectedModels, setDetectedModels] = useState<{ id: string; name: string; description: string }[]>([]);
  
  // Agent states
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: "",
    role: "",
    systemPrompt: "",
    avatar: "🤖",
    skills: "[]",
  });
  const [availableSkills, setAvailableSkills] = useState<{ id: string; name: string; description: string }[]>([]);

  const importRef = useRef<HTMLInputElement>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
    } catch {
      toast.error("Failed to fetch providers");
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setAvailableSkills(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      setLocalSettings(settings);
      fetchProviders();
      fetchSkills();
      fetchModels();
    }
  }, [settingsOpen, settings, fetchProviders, fetchSkills, fetchModels]);

  const handleSaveAgent = async () => {
    if (!agentForm.name || !agentForm.role || !agentForm.systemPrompt) {
      return toast.error("Please fill in all required fields");
    }

    try {
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : "/api/agents";
      const method = editingAgent ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentForm),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingAgent) {
          updateAgent(editingAgent.id, data);
          toast.success("Agent updated");
        } else {
          addAgent(data);
          toast.success("Agent created");
        }
        setIsAddingAgent(false);
        setEditingAgent(null);
        setAgentForm({ name: "", role: "", systemPrompt: "", avatar: "🤖", skills: "[]" });
      }
    } catch {
      toast.error("Failed to save agent");
    }
  };

  const toggleSkill = (skillId: string) => {
    const currentSkills = JSON.parse(agentForm.skills || "[]");
    const newSkills = currentSkills.includes(skillId)
      ? currentSkills.filter((s: string) => s !== skillId)
      : [...currentSkills, skillId];
    setAgentForm({ ...agentForm, skills: JSON.stringify(newSkills) });
  };

  const handleDetectModels = async () => {
    if (!newProvider.baseUrl || !newProvider.apiKey) {
      return toast.error("Base URL and API Key are required for detection");
    }

    setIsDetectingModels(true);
    setDetectedModels([]);
    try {
      const res = await fetch("/api/providers/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: newProvider.baseUrl,
          apiKey: newProvider.apiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDetectedModels(data);
        if (data.length > 0) {
          toast.success(`Detected ${data.length} models`);
        } else {
          toast.warning("No models detected. Check your API key and URL.");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to detect models");
      }
    } catch {
      toast.error("Network error during model detection");
    } finally {
      setIsDetectingModels(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!newProvider.name) return toast.error("Provider name is required");
    try {
      if (editingProviderId) {
        // Edit mode
        const res = await fetch(`/api/providers/${editingProviderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProvider),
        });
        if (res.ok) {
          toast.success("Provider updated");
          setNewProvider({ name: "", baseUrl: "", apiKey: "" });
          setDetectedModels([]);
          setIsAddingProvider(false);
          setEditingProviderId(null);
          fetchProviders();
          fetchModels();
        } else {
          toast.error("Failed to update provider");
        }
      } else {
        // Add mode
        const res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProvider),
        });
        if (res.ok) {
          toast.success("Provider added");
          setNewProvider({ name: "", baseUrl: "", apiKey: "" });
          setDetectedModels([]);
          setIsAddingProvider(false);
          fetchProviders();
          fetchModels(); // Refresh models list globally
        } else {
          toast.error("Failed to add provider");
        }
      }
    } catch {
      toast.error(editingProviderId ? "Failed to update provider" : "Failed to add provider");
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await fetch(`/api/providers/${id}`, { method: "DELETE" });
      setProviders(providers.filter(p => p.id !== id));
      toast.success("Provider removed");
      fetchModels(); // Refresh models list globally
    } catch {
      toast.error("Failed to remove provider");
    }
  };

  // Automatic model detection when API key is entered
  useEffect(() => {
    if (newProvider.baseUrl && newProvider.apiKey && newProvider.apiKey.length > 5) {
      const timer = setTimeout(() => {
        handleDetectModels();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newProvider.apiKey, newProvider.baseUrl]);

  const handleUpdateProvider = async (id: string, data: Partial<Provider>) => {
    try {
      await fetch(`/api/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      fetchProviders();
      fetchModels(); // Refresh models list globally
    } catch {
      toast.error("Failed to update provider");
    }
  };

  const handleSave = async () => {
    setSettings(localSettings);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
    setSettingsOpen(false);
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gemini-chat-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chats exported successfully");
    } catch {
      toast.error("Failed to export chats");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const conversations = Array.isArray(data) ? data : data.conversations;

      if (!conversations) {
        toast.error("Invalid export file format");
        return;
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(result.message);
        // Refresh conversations
        const convRes = await fetch("/api/conversations");
        const convs = await convRes.json();
      } else {
        toast.error(result.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import chats");
    }

    if (importRef.current) importRef.current.value = "";
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    toast.info("Settings reset to defaults. Click Save to apply.");
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-0 mt-4 flex-1 overflow-hidden">
          <Tabs defaultValue="general" orientation="vertical" className="w-full flex flex-col md:flex-row h-full overflow-hidden">
            <TabsList className="flex md:flex-col h-full bg-muted/30 border-r p-2 md:w-48 justify-start gap-1 rounded-none shrink-0">
              {[
                { id: "general", label: "General", icon: MessageSquare },
                { id: "model", label: "Model", icon: Sparkles },
                { id: "appearance", label: "Appearance", icon: Palette },
                { id: "agents", label: "Agents", icon: Users },
                { id: "providers", label: "Providers", icon: ShieldCheck },
                { id: "data", label: "Data", icon: Download },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="justify-start px-3 py-2 h-9 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary border-0 rounded-md w-full"
                >
                  <tab.icon className="h-3.5 w-3.5 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="general" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">Default System Instructions</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="Enter custom system instructions for Gemini..."
                    value={localSettings.systemPrompt}
                    onChange={(e) => setLocalSettings({ ...localSettings, systemPrompt: e.target.value })}
                    className="min-h-[120px] text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    These instructions will be prepended to every message unless overridden per conversation.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send on Enter</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.sendOnEnter}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, sendOnEnter: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select
                    value={localSettings.fontSize}
                    onValueChange={(v) =>
                      setLocalSettings({
                        ...localSettings,
                        fontSize: v as "small" | "medium" | "large",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="model" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={localSettings.defaultModel}
                    onValueChange={(v) =>
                      setLocalSettings({ ...localSettings, defaultModel: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex flex-col">
                            <span>{m.name}</span>
                            <span className="text-[10px] text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    This model will be used for new conversations. You can change it per conversation in the top bar.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    API Key (Optional)
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Gemini API key to override CLI"
                    value={localSettings.apiKey}
                    onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only needed if you want to use the API directly instead of the CLI. The Gemini CLI will be used by default.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={localSettings.theme}
                    onValueChange={(v) => {
                      const newTheme = v as "light" | "dark" | "system";
                      setLocalSettings({ ...localSettings, theme: newTheme });
                      setTheme(newTheme);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="agents" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-semibold">Custom Agents</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setIsAddingAgent(!isAddingAgent);
                      setEditingAgent(null);
                      setAgentForm({ name: "", role: "", systemPrompt: "", avatar: "🤖", skills: "[]" });
                    }}
                  >
                    {isAddingAgent ? "Cancel" : <><Plus className="h-3.5 w-3.5 mr-1.5" /> Create Agent</>}
                  </Button>
                </div>

                {(isAddingAgent || editingAgent) && (
                  <div className="p-4 rounded-xl border bg-accent/10 mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="a-name" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Agent Name</Label>
                        <Input
                          id="a-name"
                          placeholder="e.g. Code Expert"
                          className="h-9 text-sm"
                          value={agentForm.name}
                          onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="a-role" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Role / Specialty</Label>
                        <Input
                          id="a-role"
                          placeholder="e.g. Senior Developer"
                          className="h-9 text-sm"
                          value={agentForm.role}
                          onChange={(e) => setAgentForm({ ...agentForm, role: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="a-prompt" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">System Instructions</Label>
                      <Textarea
                        id="a-prompt"
                        placeholder="Describe how this agent should behave..."
                        className="min-h-[100px] text-xs"
                        value={agentForm.systemPrompt}
                        onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Assign Skills</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                        {availableSkills.map((skill) => {
                          const isSelected = JSON.parse(agentForm.skills || "[]").includes(skill.id);
                          return (
                            <div
                              key={skill.id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] cursor-pointer transition-colors",
                                isSelected ? "bg-primary/20 border-primary/50" : "bg-card hover:bg-accent/50"
                              )}
                              onClick={() => toggleSkill(skill.id)}
                            >
                              {isSelected ? <Check className="h-3 w-3" /> : <div className="h-3 w-3" />}
                              <span className="truncate">{skill.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button className="w-full h-9 text-xs" onClick={handleSaveAgent}>
                      {editingAgent ? "Update Agent" : "Create Agent"}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {agents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-xs">No custom agents found.</p>
                    </div>
                  ) : (
                    agents.map((agent) => (
                      <div key={agent.id} className="group p-4 rounded-xl border bg-card flex items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                            {agent.avatar || agent.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{agent.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{agent.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingAgent(agent);
                              setAgentForm({
                                name: agent.name,
                                role: agent.role,
                                systemPrompt: agent.systemPrompt,
                                avatar: agent.avatar || "🤖",
                                skills: agent.skills || "[]",
                              });
                              setIsAddingAgent(false);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              try {
                                await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
                                removeAgent(agent.id);
                                toast.success("Agent removed");
                              } catch {
                                toast.error("Failed to remove agent");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="providers" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-semibold">Managed Providers</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      if (isAddingProvider) {
                        setIsAddingProvider(false);
                        setEditingProviderId(null);
                        setNewProvider({ name: "", baseUrl: "", apiKey: "" });
                        setDetectedModels([]);
                      } else {
                        setIsAddingProvider(true);
                        setEditingProviderId(null);
                        setNewProvider({ name: "", baseUrl: "", apiKey: "" });
                        setDetectedModels([]);
                      }
                    }}
                  >
                    {isAddingProvider ? "Cancel" : <><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Provider</>}
                  </Button>
                </div>

                {isAddingProvider && (
                  <div className="p-4 rounded-xl border bg-accent/10 mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {!editingProviderId && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Quick Select Provider</Label>
                        <Select
                          onValueChange={(val) => {
                            if (val === "custom") {
                              setNewProvider({ ...newProvider, name: "", baseUrl: "" });
                            } else {
                              const p = KNOWN_PROVIDERS.find(kp => kp.name === val);
                              if (p) {
                                setNewProvider({ ...newProvider, name: p.name, baseUrl: p.baseUrl });
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Choose a known provider..." />
                          </SelectTrigger>
                          <SelectContent>
                            {KNOWN_PROVIDERS.map((kp) => (
                              <SelectItem key={kp.name} value={kp.name}>{kp.name}</SelectItem>
                            ))}
                            <SelectItem value="custom">Custom / Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-name" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Name</Label>
                        <Input
                          id="p-name"
                          placeholder="e.g. My Provider"
                          className="h-9 text-sm"
                          value={newProvider.name}
                          onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                          disabled={!!editingProviderId} // Keep name disabled during edit to prevent schema conflict
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-url" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Base URL</Label>
                        <Input
                          id="p-url"
                          placeholder="https://api..."
                          className="h-9 text-sm"
                          value={newProvider.baseUrl}
                          onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="p-key" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">API Key / Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          id="p-key"
                          type="password"
                          placeholder="sk-..."
                          className="h-9 text-sm flex-1"
                          value={newProvider.apiKey}
                          onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                        />
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-9 text-xs" 
                          onClick={handleDetectModels}
                          disabled={isDetectingModels || !newProvider.apiKey || !newProvider.baseUrl}
                        >
                          {isDetectingModels ? <RotateCcw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                          Detect
                        </Button>
                      </div>
                    </div>

                    {detectedModels.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Detected Models ({detectedModels.length})</Label>
                        <div className="max-h-[120px] overflow-y-auto border rounded-lg p-2 bg-background/50">
                          <div className="flex flex-wrap gap-1.5">
                            {detectedModels.map((m) => (
                              <div key={m.id} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 font-medium">
                                {m.id}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Button className="w-full h-9 text-xs" onClick={handleSaveProvider}>
                      {editingProviderId ? "Update Provider Configuration" : "Save Provider Configuration"}
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {providers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                      <Server className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-xs">No providers configured yet.</p>
                    </div>
                  ) : (
                    providers.map((p) => (
                      <div key={p.id} className="group p-4 rounded-xl border bg-card/50 flex items-center justify-between gap-4 hover:border-primary/40 hover:bg-card transition-all shadow-sm">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                            <Server className="h-5 w-5 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{p.name}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 font-bold uppercase tracking-wider">Active</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {p.baseUrl || "Default API Endpoint"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditingProviderId(p.id);
                              setNewProvider({ name: p.name, baseUrl: p.baseUrl || "", apiKey: p.apiKey || "" });
                              setIsAddingProvider(true);
                            }}
                            title="Edit provider configuration"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              toast.promise(fetchModels(), {
                                loading: "Syncing models...",
                                success: "Models synced",
                                error: "Sync failed",
                              });
                            }}
                            title="Sync models for this provider"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteProvider(p.id)}
                            title="Delete provider"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-4 mt-0 border-0 p-0 focus-visible:ring-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50">
                    <div>
                      <p className="text-sm font-bold">Export Conversations</p>
                      <p className="text-[11px] text-muted-foreground">Download all your chat history as a JSON file.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50">
                    <div>
                      <p className="text-sm font-bold">Import Data</p>
                      <p className="text-[11px] text-muted-foreground">Restore conversations from a previously exported JSON.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => importRef.current?.click()}
                      className="h-8"
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Import
                    </Button>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImport}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                    <div>
                      <p className="text-sm font-bold text-destructive">Factory Reset</p>
                      <p className="text-[11px] text-muted-foreground">Reset all application settings to their default values.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset} className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      Reset All
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-muted/20">
          <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="px-8">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
