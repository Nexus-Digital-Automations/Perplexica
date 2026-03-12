// Prices in USD per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Anthropic (via OpenAI compat)
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  // Gemini
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
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
  const key = Object.keys(PRICING).find(
    (k) => modelId === k || modelId.startsWith(k),
  );
  if (!key) return null;
  const p = PRICING[key];
  return (
    (usage.prompt_tokens * p.input + usage.completion_tokens * p.output) /
    1_000_000
  );
}
