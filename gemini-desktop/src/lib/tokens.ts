export function countTokens(text: string): number {
  if (!text) return 0;
  const charEstimate = Math.ceil(text.length / 4);
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordEstimate = Math.ceil(words / 0.75);
  return Math.round((charEstimate + wordEstimate) / 2);
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-3.1-pro": { input: 1.25, output: 10 },
  "gemini-3-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "gemini-3-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 0.075, output: 0.30 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gpt-4o": { input: 2.50, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-sonnet": { input: 3, output: 15 },
  "claude-opus": { input: 15, output: 75 },
  "deepseek-chat": { input: 0.27, output: 1.10 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
};

const DEFAULT_PRICING = { input: 1, output: 5 };

function getModelPricing(model: string): { input: number; output: number } {
  const lower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (lower.includes(key)) return pricing;
  }
  return DEFAULT_PRICING;
}

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { cost: number; currency: string } {
  const pricing = getModelPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return { cost: inputCost + outputCost, currency: "USD" };
}

export function getTokenColor(tokens: number): string {
  if (tokens < 1000) return "text-green-500";
  if (tokens < 5000) return "text-yellow-500";
  return "text-red-500";
}

export function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}
