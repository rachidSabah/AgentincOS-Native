"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, useAgentStore, useUIStore, useSkillStore, useSettingsStore } from "@/lib/stores";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  MessageSquare,
  Trash2,
  Search,
  MoreHorizontal,
  Pencil,
  Users,
  UserPlus,
  CheckSquare,
  Square,
  X,
  Wrench,
  BookOpen,
  Terminal,
  FolderOpen,
  Star,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";

export function ChatSidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    removeConversation,
    updateConversation,
  } = useChatStore();
  const { agents, activeAgentId, setActiveAgentId, removeAgent } = useAgentStore();
  const { skills, activeSkillId, setActiveSkillId, addSkill, removeSkill } = useSkillStore();
  const { settings, updateSetting } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null);

  // Workspace configuration
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState(settings.workspacePath || "");

  useEffect(() => {
    setWorkspaceInput(settings.workspacePath || "");
  }, [settings.workspacePath]);

  const saveWorkspace = async () => {
    try {
      updateSetting("workspacePath", workspaceInput);
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspacePath: workspaceInput }),
      });
      setIsEditingWorkspace(false);
      toast.success("Workspace directory updated");
    } catch (e) {
      console.error("Failed to save workspace path:", e);
      toast.error("Failed to save workspace directory");
    }
  };

  // Skill creation state
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<{ type: "input" | "output" | "error"; text: string }[]>([
    { type: "output", text: "Proxima local terminal initialized. Ready for shell operations." }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [currentCwd, setCurrentCwd] = useState(settings.workspacePath || "");
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings.workspacePath) {
      setCurrentCwd(settings.workspacePath);
    }
  }, [settings.workspacePath]);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory]);

  const runTerminalCommand = async () => {
    if (!terminalInput.trim() || isRunningCommand) return;
    const cmd = terminalInput.trim();
    setTerminalHistory((prev) => [...prev, { type: "input", text: `${currentCwd || "~"}> ${cmd}` }]);
    setTerminalInput("");
    setIsRunningCommand(true);

    try {
      const res = await fetch("/api/local/cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd: currentCwd }),
      });
      const data = await res.json();
      if (data.error) {
        setTerminalHistory((prev) => [...prev, { type: "error", text: data.error }]);
      } else {
        if (data.stdout) {
          setTerminalHistory((prev) => [...prev, { type: "output", text: data.stdout }]);
        }
        if (data.stderr) {
          setTerminalHistory((prev) => [...prev, { type: "error", text: data.stderr }]);
        }
        if (!data.stdout && !data.stderr) {
          setTerminalHistory((prev) => [...prev, { type: "output", text: "(Command completed with no output)" }]);
        }
      }
    } catch (e: any) {
      setTerminalHistory((prev) => [...prev, { type: "error", text: `Failed to execute: ${e.message}` }]);
    } finally {
      setIsRunningCommand(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteConversations = filteredConversations.filter((c) => c.isFavorite);
  const nonFavoriteConversations = filteredConversations.filter((c) => !c.isFavorite);

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = nonFavoriteConversations.reduce(
    (groups, conv) => {
      const date = new Date(conv.updatedAt).toDateString();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let label: string;
      if (date === today) label = "Today";
      else if (date === yesterday) label = "Yesterday";
      else label = formatDate(new Date(conv.updatedAt));
      if (!groups[label]) groups[label] = [];
      groups[label].push(conv);
      return groups;
    },
    {} as Record<string, typeof filteredConversations>
  );

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const handleRename = async (id: string) => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      updateConversation(id, { title: trimmedTitle });
      try {
        await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmedTitle }),
        });
        toast.success("Conversation renamed");
      } catch (error) {
        console.error("Failed to persist rename:", error);
        toast.error("Failed to rename conversation");
      }
    }
    setEditingId(null);
  };

  const toggleFavorite = async (id: string, currentVal: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !currentVal;
    updateConversation(id, { isFavorite: newVal });
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newVal }),
      });
      toast.success(newVal ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorites");
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    idsToDelete.forEach((id) => removeConversation(id));
    exitSelectMode();
    setBulkDeleteOpen(false);
    toast.success(`${idsToDelete.length} conversation${idsToDelete.length !== 1 ? "s" : ""} deleted`);

    await Promise.all(
      idsToDelete.map(async (id) => {
        try {
          await fetch(`/api/conversations/${id}`, {
            method: "DELETE",
          });
        } catch (error) {
          console.error(`Failed to delete conversation ${id}:`, error);
        }
      })
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-card/50 border-r border-border">
        {/* Active Workspace Panel */}
        <div className="p-3 border-b border-border bg-accent/15 select-none">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              Active Workspace
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsEditingWorkspace(!isEditingWorkspace)}
              title="Edit workspace path"
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
          </div>
          {isEditingWorkspace ? (
            <div className="space-y-1.5">
              <Input
                placeholder="Path to workspace..."
                className="h-8 text-xs font-mono bg-background"
                value={workspaceInput}
                onChange={(e) => setWorkspaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveWorkspace();
                }}
              />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setIsEditingWorkspace(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={saveWorkspace}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/80">
              <span className="text-[11px] font-mono truncate max-w-[200px]" title={settings.workspacePath || "No active workspace"}>
                {settings.workspacePath || "No active workspace"}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm animate-pulse" />
            </div>
          )}
        </div>

        <div className="p-3 pb-0">
          <Tabs defaultValue="chats" className="w-full">
            <TabsList className="!flex !w-full h-9 bg-background/50 p-1 rounded-lg">
              <TabsTrigger value="chats" className="flex-1 text-[10px] px-1 gap-1 justify-center">
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span>Chats</span>
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex-1 text-[10px] px-1 gap-1 justify-center">
                <Users className="h-3 w-3 shrink-0" />
                <span>Agents</span>
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex-1 text-[10px] px-1 gap-1 justify-center">
                <Wrench className="h-3 w-3 shrink-0" />
                <span>Skills</span>
              </TabsTrigger>
              <TabsTrigger value="terminal" className="flex-1 text-[10px] px-1 gap-1 justify-center">
                <Terminal className="h-3 w-3 shrink-0" />
                <span>Terminal</span>
              </TabsTrigger>
            </TabsList>

            {/* ── CHATS TAB ── */}
            <TabsContent value="chats" className="mt-3 space-y-3">
              {/* Action row */}
              {selectMode ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={toggleSelectAll}
                    title={selectedIds.size === filteredConversations.length ? "Deselect all" : "Select all"}
                  >
                    {selectedIds.size === filteredConversations.length ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground flex-1">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={selectedIds.size === 0}
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={exitSelectMode}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start gap-2 h-9 text-sm"
                    onClick={() => setActiveConversationId(null)}
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Select conversations"
                    onClick={() => setSelectMode(true)}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Conversation List */}
              <ScrollArea className="h-[calc(100vh-220px)] -mx-2 px-2">
                {/* ── FAVORITES SECTION ── */}
                {favoriteConversations.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-amber-500 animate-pulse" />
                      Favorites
                    </div>
                    {favoriteConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "relative group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-all duration-200",
                          selectMode && selectedIds.has(conv.id)
                            ? "bg-primary/10 border border-primary/30"
                            : activeConversationId === conv.id
                            ? "bg-accent text-accent-foreground font-medium pl-4"
                            : "hover:bg-accent/50 text-muted-foreground"
                        )}
                      >
                        {/* Active indicator bar */}
                        {activeConversationId === conv.id && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full z-20" />
                        )}

                        {/* Row selection click target */}
                        <div
                          className="absolute inset-0 z-0 rounded-lg"
                          onClick={(e) => {
                            if (selectMode) {
                              toggleSelect(conv.id, e);
                            } else {
                              setActiveConversationId(conv.id);
                            }
                          }}
                        />

                        {/* Checkbox in select mode, icon otherwise */}
                        {selectMode ? (
                          <Checkbox
                            checked={selectedIds.has(conv.id)}
                            onCheckedChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(conv.id)) next.delete(conv.id);
                                else next.add(conv.id);
                                return next;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 z-10"
                          />
                        ) : (
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400 z-10" />
                        )}

                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1 z-10">
                            <Input
                              ref={inputRef}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(conv.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-7 text-xs flex-1 bg-background"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-500 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(conv.id);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-destructive shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="flex-1 truncate text-xs z-10 pointer-events-none select-none">
                            {conv.title}
                          </span>
                        )}

                        {!selectMode && editingId !== conv.id && (
                          <div className="relative flex items-center gap-0.5 shrink-0 ml-auto z-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500"
                              title="Unfavorite"
                              onClick={(e) => toggleFavorite(conv.id, true, e)}
                            >
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv.id);
                                setEditTitle(conv.title);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialogId(conv.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── STANDARD GROUPED LIST ── */}
                {Object.entries(groupedConversations).map(([label, convs]) => (
                  <div key={label} className="mb-2">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {label}
                    </div>
                    {convs.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "relative group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-all duration-200",
                          selectMode && selectedIds.has(conv.id)
                            ? "bg-primary/10 border border-primary/30"
                            : activeConversationId === conv.id
                            ? "bg-accent text-accent-foreground font-medium pl-4"
                            : "hover:bg-accent/50 text-muted-foreground"
                        )}
                      >
                        {/* Active indicator bar */}
                        {activeConversationId === conv.id && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full z-20" />
                        )}

                        {/* Row selection click target */}
                        <div
                          className="absolute inset-0 z-0 rounded-lg"
                          onClick={(e) => {
                            if (selectMode) {
                              toggleSelect(conv.id, e);
                            } else {
                              setActiveConversationId(conv.id);
                            }
                          }}
                        />

                        {/* Checkbox in select mode, icon otherwise */}
                        {selectMode ? (
                          <Checkbox
                            checked={selectedIds.has(conv.id)}
                            onCheckedChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(conv.id)) next.delete(conv.id);
                                else next.add(conv.id);
                                return next;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 z-10"
                          />
                        ) : (
                          <MessageSquare className="h-4 w-4 shrink-0 z-10" />
                        )}

                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1 z-10">
                            <Input
                              ref={inputRef}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(conv.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-7 text-xs flex-1 bg-background"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-500 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(conv.id);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-destructive shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="flex-1 truncate text-xs z-10 pointer-events-none select-none">
                            {conv.title}
                          </span>
                        )}

                        {!selectMode && editingId !== conv.id && (
                          <div className="relative flex items-center gap-0.5 shrink-0 ml-auto z-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-500"
                              title="Favorite"
                              onClick={(e) => toggleFavorite(conv.id, false, e)}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv.id);
                                setEditTitle(conv.title);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialogId(conv.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {searchQuery ? "No matching conversations" : "No conversations yet"}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── AGENTS TAB ── */}
            <TabsContent value="agents" className="mt-3 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10 text-sm"
                onClick={() => useUIStore.getState().setSettingsOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Manage Agents
              </Button>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[calc(100vh-220px)] -mx-2 px-2">
                <div className="space-y-1">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                        activeAgentId === agent.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50 text-muted-foreground"
                      )}
                      onClick={() => setActiveAgentId(agent.id)}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] shrink-0">
                        {agent.avatar || agent.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{agent.role}</div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              useUIStore.getState().setSettingsOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteAgentId(agent.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                      {searchQuery ? "No matching agents" : "No custom agents yet"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── SKILLS TAB ── */}
            <TabsContent value="skills" className="mt-3 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10 text-sm"
                onClick={() => setAddSkillOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Skill
              </Button>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search skills..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[calc(100vh-220px)] -mx-2 px-2">
                <div className="space-y-1">
                  {filteredSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className={cn(
                        "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                        activeSkillId === skill.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50 text-muted-foreground"
                      )}
                      onClick={() => setActiveSkillId(skill.id)}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] shrink-0">
                        <Wrench className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{skill.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{skill.description}</div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              // View source functionality could be added later
                            }}
                          >
                            <BookOpen className="h-3.5 w-3.5 mr-2" />
                            View Source
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSkillId(skill.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {filteredSkills.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                      {searchQuery ? "No matching skills" : "No custom skills yet"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── TERMINAL TAB ── */}
            <TabsContent value="terminal" className="mt-3 space-y-3 flex flex-col h-[calc(100vh-220px)]">
              <div className="flex-1 flex flex-col min-h-0 bg-background/90 rounded-lg border border-border/80 p-2.5 font-mono text-[10px] relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
                
                <ScrollArea className="flex-1 pr-1">
                  <div className="space-y-1.5 whitespace-pre-wrap leading-relaxed">
                    {terminalHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          item.type === "input" ? "text-primary/95 font-semibold" :
                          item.type === "error" ? "text-destructive/90" : "text-muted-foreground/90"
                        )}
                      >
                        {item.text}
                      </div>
                    ))}
                    {isRunningCommand && (
                      <div className="text-primary/70 animate-pulse flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                        Running...
                      </div>
                    )}
                    <div ref={terminalBottomRef} />
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-1">
                <Input
                  placeholder="Type shell command..."
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runTerminalCommand();
                  }}
                  disabled={isRunningCommand}
                  className="h-8 text-[11px] font-mono bg-background/50 flex-1 border-border/80 focus-visible:ring-primary/40"
                />
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1"
                  onClick={runTerminalCommand}
                  disabled={isRunningCommand || !terminalInput.trim()}
                >
                  Run
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[9px] font-mono text-muted-foreground"
                  onClick={() => setTerminalInput("dir")}
                >
                  dir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[9px] font-mono text-muted-foreground"
                  onClick={() => setTerminalInput("git status")}
                >
                  git status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[9px] font-mono text-muted-foreground"
                  onClick={() => setTerminalInput("npm run dev")}
                >
                  npm run dev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[9px] font-mono text-muted-foreground"
                  onClick={() => setTerminalHistory([{ type: "output", text: "Terminal cleared." }])}
                >
                  clear
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Single Chat Dialog */}
      <Dialog open={deleteDialogId !== null} onOpenChange={(open) => !open && setDeleteDialogId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteDialogId) {
                  const targetId = deleteDialogId;
                  removeConversation(targetId);
                  try {
                    await fetch(`/api/conversations/${targetId}`, {
                      method: "DELETE",
                    });
                    toast.success("Conversation deleted");
                  } catch (error) {
                    console.error("Failed to delete conversation:", error);
                    toast.error("Failed to delete conversation");
                  }
                }
                setDeleteDialogId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Conversation{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>Permanently delete selected conversations. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete {selectedIds.size} selected conversation{selectedIds.size !== 1 ? "s" : ""}. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedIds.size} Conversation{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Agent Dialog */}
      <Dialog open={deleteAgentId !== null} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>This will not delete any conversations.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this agent? This will not delete any conversations.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAgentId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteAgentId) {
                  try {
                    await fetch(`/api/agents/${deleteAgentId}`, { method: "DELETE" });
                    removeAgent(deleteAgentId);
                    toast.success("Agent deleted successfully");
                  } catch (e) {
                    toast.error("Failed to delete agent");
                  }
                }
                setDeleteAgentId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Skill Dialog */}
      <Dialog open={addSkillOpen} onOpenChange={(open) => !open && setAddSkillOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>Create a new skill folder and SKILL.md template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill Name</label>
              <Input
                placeholder="e.g. Data Analysis"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="What this skill does..."
                value={newSkillDesc}
                onChange={(e) => setNewSkillDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSkillOpen(false)}>Cancel</Button>
            <Button
              disabled={!newSkillName || isAddingSkill}
              onClick={async () => {
                setIsAddingSkill(true);
                try {
                  const res = await fetch("/api/skills", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newSkillName, description: newSkillDesc }),
                  });
                  if (res.ok) {
                    const skill = await res.json();
                    addSkill(skill);
                    setAddSkillOpen(false);
                    setNewSkillName("");
                    setNewSkillDesc("");
                    toast.success("Skill created successfully");
                  } else {
                    toast.error("Failed to create skill");
                  }
                } catch (error) {
                  console.error("Failed to add skill:", error);
                  toast.error("Failed to create skill");
                } finally {
                  setIsAddingSkill(false);
                }
              }}
            >
              {isAddingSkill ? "Adding..." : "Add Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Skill Dialog */}
      <Dialog open={deleteSkillId !== null} onOpenChange={(open) => !open && setDeleteSkillId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>This will delete the skill folder and all its contents.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this skill? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSkillId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteSkillId) {
                  try {
                    // We need a DELETE API for skills too
                    await fetch(`/api/skills/${deleteSkillId}`, { method: "DELETE" });
                    removeSkill(deleteSkillId);
                    toast.success("Skill deleted successfully");
                  } catch (e) {
                    toast.error("Failed to delete skill");
                  }
                }
                setDeleteSkillId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

