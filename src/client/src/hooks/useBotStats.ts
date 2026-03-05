import { useMemo } from 'react';

// Common interface derived from BotsPage.tsx, ChatPage.tsx, BotAvatar.tsx
export interface BotData {
  id: string;
  name: string;
  provider: string; // Message Provider Name
  messageProvider?: string; // Alternative field from API
  llmProvider: string; // LLM Provider Name
  persona?: string; // Bot Persona
  status: string;
  connected: boolean;
  messageCount: number;
  errorCount: number;
  config?: any; // Bot specific config overrides
  envOverrides?: any;
}

export interface BotStats {
  active: number;
  disconnected: number;
  errors: number;
  llmProviders: Record<string, number>;
}

/**
 * Hook to calculate aggregated bot statistics.
 */
export function useBotStats(bots: BotData[]): BotStats {
  return useMemo(() => {
    return bots.reduce(
      (acc, bot) => {
        if (bot.status === 'active') {
          if (bot.connected) {
            acc.active++;
          } else {
            acc.disconnected++;
          }
        }
        acc.errors += bot.errorCount || 0;

        const llm = bot.llmProvider || 'unknown';
        if (!acc.llmProviders[llm]) {
          acc.llmProviders[llm] = 0;
        }
        acc.llmProviders[llm]++;

        return acc;
      },
      { active: 0, disconnected: 0, errors: 0, llmProviders: {} as Record<string, number> }
    );
  }, [bots]);
}
