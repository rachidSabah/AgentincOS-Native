"use client";

import { useState } from "react";
import { useSettingsStore, useUIStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Key,
  FolderOpen,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Shield,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import { ClawHubLogo, ClawHubText } from "./ClawHubLogo";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { settings, updateSetting } = useSettingsStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [geminiKey, setGeminiKey] = useState(settings.apiKey || "");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [workspace, setWorkspace] = useState(settings.workspacePath || "");

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // 1. Save global settings (Gemini Key & Workspace Path)
      updateSetting("apiKey", geminiKey);
      updateSetting("workspacePath", workspace);

      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: geminiKey,
          workspacePath: workspace,
        }),
      });

      // 2. Save Providers to database (only if keys are set)
      const providersToCreate = [
        { name: "OpenAI", key: openaiKey },
        { name: "Anthropic", key: anthropicKey },
        { name: "Groq", key: groqKey },
        { name: "OpenRouter", key: openrouterKey },
      ].filter((p) => p.key.trim() !== "");

      await Promise.all(
        providersToCreate.map(async (p) => {
          await fetch("/api/providers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              apiKey: p.key,
              baseUrl: null,
            }),
          });
        })
      );

      // Mark as onboarded locally
      localStorage.setItem("clawhub_onboarded", "true");
      toast.success("Welcome to ClawHub Desktop! Configuration loaded.");
      onComplete();
    } catch (e) {
      console.error("Onboarding failed:", e);
      toast.error("Failed to complete setup configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md overflow-hidden animate-fade-in">
      {/* Decorative background glow elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />

      {/* Main glass card container */}
      <div className="relative w-full max-w-lg mx-4 bg-card/65 border border-border/60 shadow-2xl rounded-2xl p-8 backdrop-blur-xl flex flex-col min-h-[480px] max-h-[90vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/25 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <ClawHubLogo size={24} />
            <ClawHubText className="text-base" />
          </div>
          <div className="text-xs font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full select-none">
            Step {step} of 4
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="flex-1 flex flex-col justify-center py-2 overflow-y-auto">
          
          {/* STEP 1: Welcome Screen */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-in">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Unleash the Power of Local AI
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to ClawHub Desktop. This is a local-first, multi-provider AI chat assistant designed to be high-performance, private, and fully customizable.
              </p>
              <div className="p-3 bg-muted/30 border border-border/20 rounded-xl space-y-2 text-xs">
                <div className="flex gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    Your API keys are stored locally on your device in a secure SQLite database. No keys are ever sent to external trackers or analytics servers.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Main Providers (Gemini / Anthropic / OpenAI) */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-in">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Set Up Core LLM Keys</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Configure your API keys. You can skip any and configure them later in Settings.
              </p>

              <div className="space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                    Gemini API Key (CLI Engine)
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">Active CLI</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="h-9 text-xs focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">OpenAI API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-proj-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="h-9 text-xs focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Anthropic API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="h-9 text-xs focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Secondary Providers (Groq / OpenRouter) */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-in">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">OpenRouter & Groq</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Gain access to hundreds of open-source models using serverless endpoints.
              </p>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">OpenRouter API Key (Llama 3, Claude, Mistral)</label>
                  <Input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    className="h-9 text-xs focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Groq API Key (Ultra-fast inference)</label>
                  <Input
                    type="password"
                    placeholder="gsk_..."
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="h-9 text-xs focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Workspace Path */}
          {step === 4 && (
            <div className="space-y-4 animate-slide-in">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Active Workspace Path</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ClawHub comes with a built-in terminal sandbox. Provide a local directory path where ClawHub can analyze files, edit code, and execute terminal tools.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">Absolute Directory Path (Windows Format)</label>
                <Input
                  type="text"
                  placeholder="C:\Users\YourName\Documents\project"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="h-9 text-xs focus-visible:ring-primary"
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/20 rounded-xl mt-2 text-xs">
                <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground">Perfect! You are all set.</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Click Finish to build the workspace index, set your theme environment, and launch the dashboard shell!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border/25 pt-4 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 1 || isSaving}
            className="text-xs hover:bg-primary/10 gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>

          {step < 4 ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleNext}
              className="text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold gap-1 transition-all"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleFinish}
              disabled={isSaving}
              className="text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold gap-1 shadow-lg shadow-orange-500/20"
            >
              {isSaving ? "Configuring..." : "Launch ClawHub"}
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
