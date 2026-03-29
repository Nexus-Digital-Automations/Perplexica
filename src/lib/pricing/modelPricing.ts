// Prices in USD per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4-5': { input: 75.0, output: 150.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15.0, output: 60.0 },
  'o1-mini': { input: 1.1, output: 4.4 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'o3': { input: 10.0, output: 40.0 },
  // Anthropic (via OpenAI compat) — Claude 3.x exact matches
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  // Anthropic — Claude 3.7 / 4.x prefix keys
  // Matches: claude-3-7-sonnet-20250219, etc.
  'claude-3-7-sonnet': { input: 3.0, output: 15.0 },
  // Matches: claude-opus-4-6, claude-opus-4-5, etc.
  'claude-opus-4': { input: 15.0, output: 75.0 },
  // Matches: claude-sonnet-4-6, claude-sonnet-4-5, etc.
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  // Matches: claude-haiku-4-5, claude-haiku-4-6, etc.
  'claude-haiku-4': { input: 0.8, output: 4.0 },
  // Gemini 1.x
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  // Gemini 2.x
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  // DeepSeek
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  // Groq
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
};

export function calculateCost(
  usage:
    | { prompt_tokens: number; completion_tokens: number }
    | null
    | undefined,
  modelId: string,
): number | null {
  if (!usage) return null;
  const key = Object.keys(PRICING).find((k) => {
    if (modelId === k) return true;
    // Only match prefix for date-versioned models like "gpt-4o-2024-08-06"
    if (modelId.startsWith(k + '-')) {
      const suffix = modelId.slice(k.length + 1);
      return /^\d/.test(suffix);
    }
    return false;
  });
  if (!key) return null;
  const p = PRICING[key];
  return (
    (usage.prompt_tokens * p.input + usage.completion_tokens * p.output) /
    1_000_000
  );
}
