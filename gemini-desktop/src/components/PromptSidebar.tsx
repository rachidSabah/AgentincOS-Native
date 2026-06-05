"use client";

import { usePromptStore, useChatStore } from "@/lib/stores";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Search, Plus, Trash2, Tag, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function PromptSidebar() {
  const { prompts, addPrompt, removePrompt } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ title: "", content: "", description: "", category: "General" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPrompts = prompts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUsePrompt = (content: string) => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea.chat-input");
    if (input) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(input, content);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  };

  const handleAddPrompt = async () => {
    if (!newPrompt.title || !newPrompt.content) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrompt),
      });
      if (res.ok) {
        const data = await res.json();
        addPrompt(data);
        setAddDialogOpen(false);
        setNewPrompt({ title: "", content: "", description: "", category: "General" });
      }
    } catch (error) {
      console.error("Failed to add prompt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (res.ok) {
        removePrompt(id);
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 border-l border-border w-[280px]">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Prompt Library</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-8 h-8 text-xs bg-background/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="py-3 space-y-1">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="group relative flex flex-col gap-1.5 p-3 rounded-xl border border-transparent hover:border-border hover:bg-accent/40 cursor-pointer transition-all duration-200"
              onClick={() => handleUsePrompt(prompt.content)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {prompt.title}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  onClick={(e) => handleDeletePrompt(prompt.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed italic">
                {prompt.description || "No description"}
              </p>
              {prompt.category && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Tag className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
                    {prompt.category}
                  </span>
                </div>
              )}
            </div>
          ))}
          {filteredPrompts.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No matching prompts" : "No prompts yet"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Prompt</DialogTitle>
            <DialogDescription>Create a reusable prompt for your library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
              <Input
                placeholder="e.g. Unit Test Generator"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
              <Input
                placeholder="e.g. Development"
                value={newPrompt.category}
                onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <Input
                placeholder="Briefly describe what this prompt does"
                value={newPrompt.description}
                onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prompt Content</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="The actual prompt text... Use {placeholders} for dynamic input."
                value={newPrompt.content}
                onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button disabled={!newPrompt.title || !newPrompt.content || isSubmitting} onClick={handleAddPrompt}>
              {isSubmitting ? "Saving..." : "Save Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
