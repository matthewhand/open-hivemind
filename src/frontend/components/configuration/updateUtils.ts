import type { Bot } from '../../services/api';

export const DEFAULT_MESSAGE_PROVIDERS = ['discord', 'slack', 'mattermost'] as const;
export const DEFAULT_LLM_PROVIDERS = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'] as const;

const BASE_FIELDS: Array<keyof Bot> = ['messageProvider', 'llmProvider', 'persona', 'systemInstruction', 'mcpServers', 'mcpGuard'];

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
};

export const sanitizeBot = (bot: Bot): Bot => {
  const { metadata, ...rest } = bot as Bot & { metadata?: unknown };
  return rest;
};

export const cloneBots = (bots: Bot[]): Bot[] => JSON.parse(JSON.stringify(bots));

export const hasBotChanges = (
  originalBots: Bot[],
  updatedBots: Bot[],
  messageProviders: readonly string[] = DEFAULT_MESSAGE_PROVIDERS,
  llmProviders: readonly string[] = DEFAULT_LLM_PROVIDERS,
): boolean => {
  if (originalBots.length !== updatedBots.length) {
    return true;
  }

  return updatedBots.some((updatedBot) => {
    const originalBot = originalBots.find((bot) => bot.name === updatedBot.name);
    if (!originalBot) {
      return true;
    }
    return prepareBotUpdate(originalBot, updatedBot, messageProviders, llmProviders) !== null;
  });
};

export const prepareBotUpdate = (
  originalBot: Bot,
  updatedBot: Bot,
  messageProviders: readonly string[] = DEFAULT_MESSAGE_PROVIDERS,
  llmProviders: readonly string[] = DEFAULT_LLM_PROVIDERS,
): Record<string, unknown> | null => {
  const payload: Record<string, unknown> = {};

  BASE_FIELDS.forEach((field) => {
    const originalValue = (originalBot as any)[field];
    const updatedValue = (updatedBot as any)[field];

    if (!isEqual(originalValue, updatedValue)) {
      payload[field] = updatedValue;
    }
  });

  const providerConfigDiff: Record<string, unknown> = {};
  const providerKeys = new Set<string>([...messageProviders, ...llmProviders]);

  providerKeys.forEach((providerKey) => {
    const originalValue = (originalBot as any)[providerKey];
    const updatedValue = (updatedBot as any)[providerKey];

    if (!isEqual(originalValue, updatedValue)) {
      providerConfigDiff[providerKey] = updatedValue ?? null;
    }
  });

  if (Object.keys(providerConfigDiff).length > 0) {
    payload.config = providerConfigDiff;
  }

  return Object.keys(payload).length > 0 ? payload : null;
};

