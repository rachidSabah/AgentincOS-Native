"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Brain, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn, truncate } from "@/lib/utils";

interface Memory {
  id: string;
  key: string;
  content: string;
  source: string;
  embedding: string | null;
  createdAt: string;
  updatedAt: string;
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editKey, setEditKey] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await fetch(
        "/api/memories" + (searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "")
      );
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [searchQuery]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newContent.trim()) return;
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), content: newContent.trim(), source: "manual" }),
      });
      if (res.ok) {
        toast.success("Memory added");
        setAddDialogOpen(false);
        setNewKey("");
        setNewContent("");
        fetchMemories();
      } else {
        toast.error("Failed to add memory");
      }
    } catch (error) {
      console.error("Failed to add memory:", error);
      toast.error("Failed to add memory");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim(), key: editKey.trim() }),
      });
      if (res.ok) {
        toast.success("Memory updated");
        setEditingId(null);
        fetchMemories();
      } else {
        toast.error("Failed to update memory");
      }
    } catch (error) {
      console.error("Failed to update memory:", error);
      toast.error("Failed to update memory");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Memory deleted");
        fetchMemories();
      } else {
        toast.error("Failed to delete memory");
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
      toast.error("Failed to delete memory");
    }
    setDeleteDialogId(null);
  };

  const startEditing = (memory: Memory) => {
    setEditingId(memory.id);
    setEditKey(memory.key);
    setEditContent(memory.content);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <Button
        variant="outline"
        className="w-full justify-start gap-2 h-10 text-sm"
        onClick={() => setAddDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add Memory
      </Button>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          className="pl-8 h-8 text-xs bg-background/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-220px)] pr-1">
        <div className="space-y-1">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className={cn(
                "group flex flex-col gap-1 px-2.5 py-2 rounded-lg text-sm transition-colors",
                editingId === memory.id
                  ? "bg-accent/50 border border-primary/30"
                  : "hover:bg-accent/50 text-muted-foreground"
              )}
            >
              {editingId === memory.id ? (
                <div className="space-y-2 w-full">
                  <Input
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    className="h-7 text-xs font-medium bg-background"
                    placeholder="Key"
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-xs bg-background min-h-[80px] resize-y"
                    placeholder="Content"
                  />
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-500"
                      onClick={() => handleUpdate(memory.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{memory.key}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {truncate(memory.content, 100)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 border-muted-foreground/30 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        title="Edit"
                        onClick={() => startEditing(memory)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        title="Delete"
                        onClick={() => setDeleteDialogId(memory.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 truncate">
                    {memory.source === "manual" ? "Manual" : `From: ${truncate(memory.source, 20)}`}
                  </div>
                </>
              )}
            </div>
          ))}
          {memories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No matching memories" : "No memories yet"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={addDialogOpen} onOpenChange={(open) => !open && setAddDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Memory</DialogTitle>
            <DialogDescription>Create a new memory entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                placeholder="e.g. User Preferences"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Memory content..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button disabled={!newKey.trim() || !newContent.trim()} onClick={handleAdd}>
              Add Memory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogId !== null} onOpenChange={(open) => !open && setDeleteDialogId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Memory</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this memory? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogId && handleDelete(deleteDialogId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
