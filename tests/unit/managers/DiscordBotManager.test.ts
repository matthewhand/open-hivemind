import {
  Bot,
  DiscordBotManager,
} from '../../../packages/message-discord/src/managers/DiscordBotManager';

const makeClient = (wsStatus = 0) => ({
  ws: { status: wsStatus },
  destroy: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  login: jest.fn().mockResolvedValue(undefined),
});

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => makeClient()),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildMembers: 8,
    DirectMessages: 16,
  },
  Partials: { Channel: 'Channel' },
}));

function makeManager(): DiscordBotManager {
  return new DiscordBotManager({
    errorTypes: { ConfigError: class extends Error {}, NetworkError: class extends Error {} },
    getAllBotConfigs: () => [],
    isBotDisabled: () => false,
  } as any);
}

function injectBot(manager: DiscordBotManager, name: string, wsStatus = 0): Bot {
  const bot: Bot = {
    client: makeClient(wsStatus) as any,
    botUserId: 'uid-' + name,
    botUserName: name,
    config: { name, discord: { token: 'tok' }, token: 'tok' },
  };
  (manager as any).bots.push(bot);
  (manager as any).botMap.set(name, bot);
  return bot;
}

describe('DiscordBotManager Map-based lookups', () => {
  describe('getBotByName', () => {
    it('returns the bot when found', () => {
      const mgr = makeManager();
      injectBot(mgr, 'alpha');
      expect(mgr.getBotByName('alpha')?.botUserName).toBe('alpha');
    });

    it('returns undefined for unknown name', () => {
      const mgr = makeManager();
      expect(mgr.getBotByName('ghost')).toBeUndefined();
    });
  });

  describe('isBotConnected', () => {
    it('returns true when ws.status is 0 (READY)', () => {
      const mgr = makeManager();
      injectBot(mgr, 'beta', 0);
      expect(mgr.isBotConnected('beta')).toBe(true);
    });

    it('returns false when ws.status is non-zero', () => {
      const mgr = makeManager();
      injectBot(mgr, 'gamma', 3);
      expect(mgr.isBotConnected('gamma')).toBe(false);
    });

    it('returns false for unknown bot', () => {
      const mgr = makeManager();
      expect(mgr.isBotConnected('nobody')).toBe(false);
    });
  });

  describe('disconnectBot', () => {
    it('returns false for unknown bot', async () => {
      const mgr = makeManager();
      expect(await mgr.disconnectBot('nobody')).toBe(false);
    });

    it('removes bot from both array and Map on success', async () => {
      const mgr = makeManager();
      injectBot(mgr, 'delta');
      expect(await mgr.disconnectBot('delta')).toBe(true);
      expect(mgr.getBotByName('delta')).toBeUndefined();
      expect(mgr.getAllBots().find((b) => b.botUserName === 'delta')).toBeUndefined();
    });

    it('returns false when client.destroy throws', async () => {
      const mgr = makeManager();
      const bot = injectBot(mgr, 'epsilon');
      (bot.client.destroy as jest.Mock).mockRejectedValueOnce(new Error('network error'));
      expect(await mgr.disconnectBot('epsilon')).toBe(false);
    });

    it('does not affect other bots when one is disconnected', async () => {
      const mgr = makeManager();
      injectBot(mgr, 'zeta');
      injectBot(mgr, 'eta');
      await mgr.disconnectBot('zeta');
      expect(mgr.getBotByName('eta')).toBeDefined();
      expect(mgr.getAllBots()).toHaveLength(1);
    });
  });
});
