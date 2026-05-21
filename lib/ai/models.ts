export const MODELS = {
  chat: 'anthropic/claude-sonnet-4-6',
} as const;

export type ModelKey = keyof typeof MODELS;
