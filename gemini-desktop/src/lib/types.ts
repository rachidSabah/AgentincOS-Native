export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  avatar: string | null;
  skills: string | null; // JSON array
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
}

export interface Memory {
  id: string;
  key: string;
  content: string;
  source: string;
  embedding: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string | null;
  category: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt: string | null;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  agentId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  attachments: string | null;
  metadata: string | null;
  toolCalls?: string | null;
  edited?: boolean;
  parentId?: string | null;
  createdAt: string;
  conversation?: Conversation;
}

export interface Attachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  cost?: number;
  duration?: number;
  isStreaming?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string | null;
  apiKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  defaultModel: string;
  theme: "light" | "dark" | "system";
  systemPrompt: string;
  apiKey: string;
  fontSize: "small" | "medium" | "large";
  sendOnEnter: boolean;
  providers?: Provider[];
  workspacePath?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: "auto",
  theme: "dark",
  systemPrompt: "",
  apiKey: "",
  fontSize: "medium",
  sendOnEnter: true,
  workspacePath: "",
};

export interface Model {
  id: string;
  name: string;
  description: string;
}

export interface ModelGroup {
  name: string;
  models: Model[];
}

export const AVAILABLE_MODEL_GROUPS: ModelGroup[] = [
  {
    name: "Gemini CLI Auto Modes",
    models: [
      { id: "auto", name: "Auto (Default)", description: "CLI picks best model automatically" },
      { id: "auto-gemini-3", name: "Auto (Gemini 3)", description: "CLI picks from gemini-3.1-pro, gemini-3-flash" },
      { id: "auto-gemini-2.5", name: "Auto (Gemini 2.5)", description: "CLI picks from gemini-2.5-pro, gemini-2.5-flash" },
    ]
  },
  {
    name: "Proxima (Local Gateway)",
    models: [
      { id: "proxima/all", name: "Proxima: All Providers", description: "Query ChatGPT, Claude, Gemini, Perplexity at once" },
      { id: "proxima/claude", name: "Proxima: Claude", description: "Native browser-level Claude communication" },
      { id: "proxima/chatgpt", name: "Proxima: ChatGPT", description: "Native browser-level ChatGPT communication" },
      { id: "proxima/gemini", name: "Proxima: Gemini", description: "Native browser-level Gemini communication" },
      { id: "proxima/perplexity", name: "Proxima: Perplexity", description: "Native browser-level Perplexity communication" },
      { id: "proxima/router", name: "Proxima: Smart Router", description: "Auto-picks the best AI for your query" },
    ]
  },
  {
    name: "Gemini 3 Series",
    models: [
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", description: "Latest flagship — complex reasoning" },
      { id: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fastest Gemini 3 model" },
    ]
  },
  {
    name: "Gemini 2.5 Series",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Complex tasks, long context" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast and versatile" },
    ]
  },
  {
    name: "Gemini 2.0 & Legacy",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Lightweight and fast" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Legacy pro model" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Legacy flash model" },
    ]
  },
  {
    name: "hermes / OAuth Providers",
    models: [
      { id: "nous-portal", name: "Nous Portal", description: "hermes model (OAuth, subscription-based)" },
      { id: "openai-codex", name: "OpenAI Codex", description: "hermes model (ChatGPT OAuth)" },
      { id: "github-copilot", name: "GitHub Copilot", description: "hermes model (OAuth device code flow)" },
      { id: "github-copilot-acp", name: "GitHub Copilot ACP", description: "Local copilot --acp --stdio" },
      { id: "anthropic", name: "Anthropic", description: "Claude Max + extra usage credits via OAuth" },
      { id: "google-gemini-cli", name: "Google Gemini (OAuth)", description: "hermes model, free tier support" },
    ]
  },
  {
    name: "Global API Providers",
    models: [
      { id: "openrouter", name: "OpenRouter", description: "200+ models via OpenRouter" },
      { id: "novita", name: "NovitaAI", description: "Model API, Agent Sandbox, GPU Cloud" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", description: "DeepSeek-V3 flagship model" },
      { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner", description: "DeepSeek-R1 reasoning model" },
      { id: "huggingface", name: "Hugging Face", description: "Any model from HF Hub" },
      { id: "ai-gateway", name: "AI Gateway", description: "Centralized AI access" },
    ]
  },
  {
    name: "Regional & Specialty Providers",
    models: [
      { id: "zai", name: "z.ai / GLM", description: "GLM models via z.ai" },
      { id: "kimi", name: "Kimi / Moonshot", description: "Kimi coding models" },
      { id: "kimi-cn", name: "Kimi / Moonshot (China)", description: "Kimi models (China endpoint)" },
      { id: "alibaba", name: "Alibaba Cloud", description: "DashScope / Qwen models" },
      { id: "alibaba-coding-plan", name: "Alibaba Coding Plan", description: "Separate billing SKU for coding" },
      { id: "minimax", name: "MiniMax", description: "High-quality LLMs" },
      { id: "minimax-cn", name: "MiniMax China", description: "MiniMax models (China endpoint)" },
      { id: "tencent", name: "Tencent TokenHub", description: "Tencent Maas / TokenHub" },
      { id: "xiaomi", name: "Xiaomi MiMo", description: "MiMo models" },
    ]
  },
  {
    name: "Coding & Local Models",
    models: [
      { id: "opencode-zen", name: "OpenCode Zen", description: "Zen-optimized coding models" },
      { id: "opencode-go", name: "OpenCode Go", description: "Fast coding models" },
      { id: "kilocode", name: "Kilo Code", description: "Inference-optimized models" },
      { id: "arcee", name: "Arcee AI", description: "Domain-adapted SLMs" },
      { id: "gmi", name: "GMI Cloud", description: "GPU-accelerated inference" },
      { id: "lmstudio", name: "LM Studio", description: "Local models via LM Studio" },
    ]
  }
];

export const AVAILABLE_MODELS = AVAILABLE_MODEL_GROUPS.flatMap(group => group.models);


