import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface ModelRegistryEntry {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  health: "healthy" | "degraded" | "unhealthy";
  latency?: number;
  lastChecked?: string;
  fallbackChain?: string[];
}

export interface ProviderHealth {
  name: string;
  status: "online" | "offline" | "degraded";
  models: string[];
  latency?: number;
  lastCheck?: string;
}

const DEFAULT_REGISTRY: ModelRegistryEntry[] = [
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    description: "Latest flagship model with advanced reasoning capabilities",
    capabilities: ["reasoning", "coding", "creative", "analysis"],
    health: "healthy",
    latency: 1200,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["gemini-3-flash", "gemini-2.5-pro"]
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    description: "Fast and efficient model for most tasks",
    capabilities: ["general", "fast", "efficient"],
    health: "healthy",
    latency: 800,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["gemini-2.5-flash", "gemini-2.0-flash"]
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Proven model for complex tasks",
    capabilities: ["reasoning", "analysis", "long-context"],
    health: "healthy",
    latency: 1500,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["gemini-2.5-flash", "gemini-2.0-flash"]
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast and versatile model",
    capabilities: ["general", "fast", "coding"],
    health: "healthy",
    latency: 600,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["gemini-2.0-flash"]
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Lightweight and fast model",
    capabilities: ["general", "lightweight", "fast"],
    health: "healthy",
    latency: 400,
    lastChecked: new Date().toISOString()
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Highly capable model with strong reasoning",
    capabilities: ["reasoning", "analysis", "coding", "safety"],
    health: "healthy",
    latency: 1800,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["claude-3-haiku", "gemini-3-flash"]
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Fast and efficient model",
    capabilities: ["general", "fast", "efficient"],
    health: "healthy",
    latency: 900,
    lastChecked: new Date().toISOString()
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Omni model with multimodal capabilities",
    capabilities: ["reasoning", "coding", "multimodal", "analysis"],
    health: "healthy",
    latency: 2000,
    lastChecked: new Date().toISOString(),
    fallbackChain: ["gpt-4-turbo", "claude-3-5-sonnet"]
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Fast and capable model",
    capabilities: ["reasoning", "coding", "analysis"],
    health: "healthy",
    latency: 1600,
    lastChecked: new Date().toISOString()
  }
];

export class ModelRegistry {
  private registry: ModelRegistryEntry[] = [...DEFAULT_REGISTRY];
  private providerHealth: Map<string, ProviderHealth> = new Map();

  constructor() {
    this.initializeProviderHealth();
  }

  private initializeProviderHealth() {
    const providers = ["Google", "Anthropic", "OpenAI", "Mistral", "Groq"];
    providers.forEach(provider => {
      this.providerHealth.set(provider, {
        name: provider,
        status: "online",
        models: [],
        latency: 0,
        lastCheck: new Date().toISOString()
      });
    });
  }

  async getRegistry(): Promise<ModelRegistryEntry[]> {
    try {
      // Fetch from database if available
      const dbProviders = await db.provider.findMany({
        where: { isActive: true }
      });

      // Update registry with database entries
      for (const provider of dbProviders) {
        await this.updateProviderModels(provider);
      }

      return this.registry;
    } catch (error) {
      console.error("Failed to fetch registry from database:", error);
      return this.registry;
    }
  }

  async getProviderHealth(): Promise<ProviderHealth[]> {
    const healthChecks: ProviderHealth[] = [];
    
    for (const [providerName, health] of this.providerHealth) {
      healthChecks.push({
        ...health,
        models: this.registry
          .filter(model => model.provider === providerName)
          .map(model => model.id)
      });
    }

    return healthChecks;
  }

  async updateProviderModels(provider: any): Promise<void> {
    const providerSlug = provider.name.toLowerCase().replace(/\s+/g, "-");
    const providerModels = this.registry.filter(model => 
      model.id.startsWith(`${providerSlug}/`) || model.provider === provider.name
    );

    if (providerModels.length > 0) {
      this.providerHealth.get(provider.name)?.models.push(...providerModels.map(m => m.id));
    }
  }

  async getModelHealth(modelId: string): Promise<ModelRegistryEntry | null> {
    return this.registry.find(model => model.id === modelId) || null;
  }

  async checkModelAvailability(modelId: string): Promise<boolean> {
    const model = await this.getModelHealth(modelId);
    if (!model) return false;

    // Simulate availability check
    const isAvailable = Math.random() > 0.1; // 90% availability
    model.health = isAvailable ? "healthy" : "degraded";
    model.lastChecked = new Date().toISOString();

    return isAvailable;
  }

  async getFallbackChain(modelId: string): Promise<string[]> {
    const model = await this.getModelHealth(modelId);
    return model?.fallbackChain || [];
  }

  async autoDiscoverModels(): Promise<ModelRegistryEntry[]> {
    try {
      const providers = await db.provider.findMany({
        where: { isActive: true }
      });

      const newModels: ModelRegistryEntry[] = [];

      for (const provider of providers) {
        const providerSlug = provider.name.toLowerCase().replace(/\s+/g, "-");
        
        // Generate mock models for demo purposes
        const mockModels = this.generateMockModels(provider.name, providerSlug);
        newModels.push(...mockModels);

        // Update provider health
        const providerHealth = this.providerHealth.get(provider.name);
        if (providerHealth) {
          providerHealth.models = mockModels.map(m => m.id);
          providerHealth.status = "online";
          providerHealth.lastCheck = new Date().toISOString();
        }
      }

      // Deduplicate before pushing to registry
      const existingIds = new Set(this.registry.map(m => m.id));
      const uniqueNewModels = newModels.filter(m => !existingIds.has(m.id));
      
      this.registry.push(...uniqueNewModels);
      return uniqueNewModels;
    } catch (error) {
      console.error("Auto-discovery failed:", error);
      return [];
    }
  }

  private generateMockModels(providerName: string, providerSlug: string): ModelRegistryEntry[] {
    const modelTemplates = [
      { id: "pro", name: "Pro", capabilities: ["reasoning", "analysis"] },
      { id: "flash", name: "Flash", capabilities: ["general", "fast"] },
      { id: "ultra", name: "Ultra", capabilities: ["advanced", "creative"] },
      { id: "nano", name: "Nano", capabilities: ["lightweight", "efficient"] }
    ];

    return modelTemplates.map(template => ({
      id: `${providerSlug}/${template.id}`,
      name: `${providerName} ${template.name}`,
      provider: providerName,
      description: `${providerName}'s ${template.name.toLowerCase()} model`,
      capabilities: template.capabilities,
      health: "healthy",
      latency: Math.floor(Math.random() * 2000) + 500,
      lastChecked: new Date().toISOString(),
      fallbackChain: this.generateFallbackChain(providerSlug, template.id)
    }));
  }

  private generateFallbackChain(providerSlug: string, modelId: string): string[] {
    const fallbacks = {
      pro: [`${providerSlug}/flash`, `${providerSlug}/nano`],
      flash: [`${providerSlug}/nano`],
      ultra: [`${providerSlug}/pro`, `${providerSlug}/flash`],
      nano: []
    };

    return fallbacks[modelId as keyof typeof fallbacks] || [];
  }

  async routeRequest(modelId: string, fallbackOnError = true): Promise<ModelRegistryEntry> {
    let model = await this.getModelHealth(modelId);
    
    if (!model) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    // Check availability
    const isAvailable = await this.checkModelAvailability(modelId);
    
    if (!isAvailable && fallbackOnError) {
      console.log(`Model ${modelId} unavailable, using fallback chain`);
      const fallbackChain = await this.getFallbackChain(modelId);
      
      for (const fallbackModelId of fallbackChain) {
        const fallbackModel = await this.getModelHealth(fallbackModelId);
        if (fallbackModel && await this.checkModelAvailability(fallbackModelId)) {
          console.log(`Using fallback model: ${fallbackModelId}`);
          return fallbackModel;
        }
      }
      
      throw new Error(`No available models in fallback chain for ${modelId}`);
    }

    return model;
  }
}

// Global instance
export const modelRegistry = new ModelRegistry();