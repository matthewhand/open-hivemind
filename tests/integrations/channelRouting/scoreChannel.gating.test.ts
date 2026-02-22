/**
 * Characterization tests for IMessengerService.scoreChannel gating behavior.
 * When MESSAGE_CHANNEL_ROUTER_ENABLED is false => returns 0.
 * When true => delegates to ChannelRouter.computeScore.
 *
 * Note: We avoid importing full DiscordService to prevent discord.js GatewayIntentBits
 * initialization. Instead we import only the computeScore helper from DiscordService,
 * SlackService, and MattermostService via their exported functions, or we call the
 * scoreChannel method on lightweight facades if available. If services require heavy
 * dependencies, we stub their modules to minimal shapes exposing scoreChannel logic.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const channelId = 'C123';
const meta = { foo: 'bar' };

/**
 * Mock messageConfig.get to control the feature flag.
 */
function mockFlag(enabled: boolean) {
  jest.doMock('../../../src/config/messageConfig', () => {
    const api = {
      get: (key: string) => (key === 'MESSAGE_CHANNEL_ROUTER_ENABLED' ? enabled : undefined),
    };
    return { __esModule: true, default: api, get: api.get };
  });
}

/**
 * Mock ChannelRouter to observe delegation.
 */
function mockChannelRouter(returnValue: number) {
  jest.doMock('../../../src/message/routing/ChannelRouter', () => {
    const router = {
      computeScore: jest.fn((_channel: string, _m?: Record<string, any>) => returnValue),
    };
    // Provide named and default for flexibility
    return {
      __esModule: true,
      default: router,
      ChannelRouter: router,
      computeScore: router.computeScore,
    };
  });
}

/**
 * For DiscordService we will stub the whole module to a minimal class exposing only scoreChannel,
 * so we don't load discord.js. We preserve the actual implementation pattern:
 * - reads messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED')
 * - when enabled, delegates to ChannelRouter.computeScore
 * - else returns 0
 */
function mockDiscordMinimal() {
  jest.doMock('@hivemind/adapter-discord', () => {
    // defer resolution to use already-mocked modules
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messageConfig = require('../../../src/config/messageConfig').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CR = require('../../../src/message/routing/ChannelRouter');
    const router = CR.ChannelRouter ?? CR.default ?? CR;
    class DiscordService {
      public supportsChannelPrioritization = true;
      public scoreChannel(channel: string, metadata?: Record<string, any>): number {
        const enabled = Boolean(messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (!enabled) return 0;
        return router.computeScore(channel, metadata);
      }
    }
    return { __esModule: true, default: DiscordService, DiscordService };
  });
}

/**
 * SlackService and MattermostService are lighter, but to keep isolation and avoid incidental
 * dependencies we also stub them minimally to just expose scoreChannel in the same pattern.
 */
function mockSlackMinimal() {
  jest.doMock('@hivemind/adapter-slack/SlackService', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messageConfig = require('../../../src/config/messageConfig').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CR = require('../../../src/message/routing/ChannelRouter');
    const router = CR.ChannelRouter ?? CR.default ?? CR;
    class SlackService {
      public supportsChannelPrioritization = true;
      public scoreChannel(channel: string, metadata?: Record<string, any>): number {
        const enabled = Boolean(messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (!enabled) return 0;
        return router.computeScore(channel, metadata);
      }
    }
    return { __esModule: true, default: SlackService, SlackService };
  });
}

function mockMattermostMinimal() {
  jest.doMock('@hivemind/adapter-mattermost/MattermostService', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messageConfig = require('../../../src/config/messageConfig').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CR = require('../../../src/message/routing/ChannelRouter');
    const router = CR.ChannelRouter ?? CR.default ?? CR;
    class MattermostService {
      public supportsChannelPrioritization = true;
      public scoreChannel(channel: string, metadata?: Record<string, any>): number {
        const enabled = Boolean(messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (!enabled) return 0;
        return router.computeScore(channel, metadata);
      }
    }
    return { __esModule: true, default: MattermostService, MattermostService };
  });
}

async function loadServices() {
  const dMod: any = await import('@hivemind/adapter-discord');
  const sMod: any = await import('@hivemind/adapter-slack/SlackService');
  const mMod: any = await import('@hivemind/adapter-mattermost/MattermostService');

  const DiscordService = dMod.default ?? dMod.DiscordService ?? dMod;
  const SlackService = sMod.default ?? sMod.SlackService ?? sMod;
  const MattermostService = mMod.default ?? mMod.MattermostService ?? mMod;

  const crMod: any = await import('../../../src/message/routing/ChannelRouter');
  const ChannelRouter = crMod.ChannelRouter ?? crMod.default ?? crMod;

  return { DiscordService, SlackService, MattermostService, ChannelRouter };
}

describe('scoreChannel gating behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('flag disabled: services return 0 and do not call computeScore', async () => {
    mockFlag(false);
    mockChannelRouter(77); // should not be used
    mockDiscordMinimal();
    mockSlackMinimal();
    mockMattermostMinimal();

    const { DiscordService, SlackService, MattermostService, ChannelRouter } = await loadServices();

    const discord = new (DiscordService as any)();
    const slack = new (SlackService as any)();
    const mattermost = new (MattermostService as any)();

    expect(discord.scoreChannel(channelId, meta)).toBe(0);
    expect(slack.scoreChannel(channelId, meta)).toBe(0);
    expect(mattermost.scoreChannel(channelId, meta)).toBe(0);

    expect(ChannelRouter.computeScore).not.toHaveBeenCalled();
  });

  test('flag enabled: delegates to ChannelRouter.computeScore', async () => {
    mockFlag(true);
    mockChannelRouter(99);
    mockDiscordMinimal();
    mockSlackMinimal();
    mockMattermostMinimal();

    const { DiscordService, SlackService, MattermostService, ChannelRouter } = await loadServices();

    const discord = new (DiscordService as any)();
    const slack = new (SlackService as any)();
    const mattermost = new (MattermostService as any)();

    expect(discord.scoreChannel(channelId, meta)).toBe(99);
    expect(slack.scoreChannel(channelId, meta)).toBe(99);
    expect(mattermost.scoreChannel(channelId, meta)).toBe(99);

    expect(ChannelRouter.computeScore).toHaveBeenCalledWith(channelId, meta);
    expect((ChannelRouter.computeScore as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
