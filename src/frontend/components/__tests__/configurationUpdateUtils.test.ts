import { prepareBotUpdate, hasBotChanges } from '../configuration/updateUtils';
import type { Bot } from '../../services/api';

describe('configuration update utils', () => {
  const baseBot: Bot = {
    name: 'test-bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'default',
    systemInstruction: 'be helpful',
    mcpServers: [],
    mcpGuard: undefined,
    discord: {
      token: 'token',
      clientId: 'client',
      guildId: 'guild',
      channelId: 'channel',
      voiceChannelId: 'voice',
    },
    openai: {
      apiKey: 'key',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com',
    },
  };

  it('returns null when there are no differences', () => {
    const update = prepareBotUpdate(baseBot, { ...baseBot });
    expect(update).toBeNull();
  });

  it('detects changes in top-level bot fields', () => {
    const updated: Bot = { ...baseBot, persona: 'new-persona' };
    const update = prepareBotUpdate(baseBot, updated);
    expect(update).not.toBeNull();
    expect(update).toMatchObject({ persona: 'new-persona' });
  });

  it('detects changes in provider configuration', () => {
    const updated: Bot = {
      ...baseBot,
      openai: {
        ...baseBot.openai!,
        model: 'gpt-4.1',
      },
    };
    const update = prepareBotUpdate(baseBot, updated);
    expect(update).not.toBeNull();
    expect(update).toMatchObject({
      config: {
        openai: {
          apiKey: 'key',
          model: 'gpt-4.1',
          baseUrl: 'https://api.openai.com',
        },
      },
    });
  });

  it('flags when provider configuration is removed', () => {
    const updated: Bot = { ...baseBot, discord: undefined as any };
    const update = prepareBotUpdate(baseBot, updated);
    expect(update).not.toBeNull();
    expect(update).toMatchObject({
      config: {
        discord: null,
      },
    });
  });

  it('identifies bot collections with changes', () => {
    const originalBots = [baseBot];
    const updatedBots: Bot[] = [{
      ...baseBot,
      systemInstruction: 'new instruction',
    }];

    expect(hasBotChanges(originalBots, updatedBots)).toBe(true);
    expect(hasBotChanges(originalBots, originalBots)).toBe(false);
  });
});

