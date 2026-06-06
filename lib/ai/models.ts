export const MODELS = {
  chat: 'anthropic/claude-sonnet-4-6',
  guardrail: 'anthropic/claude-haiku-4-5', // Tier-1 input classifier
  judge: 'anthropic/claude-haiku-4-5', // eval LLM-as-judge
} as const;

export type ModelKey = keyof typeof MODELS;
