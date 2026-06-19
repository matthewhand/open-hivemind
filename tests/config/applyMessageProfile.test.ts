jest.mock('../../src/config/messageProfiles', () => ({
  getMessageProfileByKey: jest.fn(),
}));

import { applyMessageProfile } from '../../src/config/botProfileHelpers';
import { getMessageProfileByKey } from '../../src/config/messageProfiles';
import type { BotConfig } from '@src/types/config';

const getProfileMock = getMessageProfileByKey as jest.Mock;

const baseConfig = (overrides: Partial<BotConfig> = {}): BotConfig =>
  ({
    name: 'hive1',
    messageProvider: 'discord',
    llmProvider: 'openai',
    ...overrides,
  }) as BotConfig;

describe('applyMessageProfile', () => {
  beforeEach(() => {
    getProfileMock.mockReset();
  });

  it('does nothing when no messageProfile is set', () => {
    const config = baseConfig();
    applyMessageProfile(config);
    expect(getProfileMock).not.toHaveBeenCalled();
    expect(config.discord).toBeUndefined();
  });

  it('does nothing for an unknown profile', () => {
    getProfileMock.mockReturnValue(undefined);
    const config = baseConfig({ messageProfile: 'ghost' });
    applyMessageProfile(config);
    expect(config.discord).toBeUndefined();
  });

  describe('discord mapping', () => {
    it('maps botToken/clientId/guildId/channelId/voiceChannelId', () => {
      getProfileMock.mockReturnValue({
        key: 'discomain',
        provider: 'discord',
        config: {
          botToken: 'tok',
          clientId: 'c1',
          guildId: 'g1',
          channelId: 'ch1',
          voiceChannelId: 'v1',
        },
      });
      const config = baseConfig({ messageProfile: 'discomain' });
      applyMessageProfile(config);
      expect(config.discord).toEqual({
        token: 'tok',
        clientId: 'c1',
        guildId: 'g1',
        channelId: 'ch1',
        voiceChannelId: 'v1',
      });
    });

    it('accepts token alias', () => {
      getProfileMock.mockReturnValue({
        key: 'discomain',
        provider: 'discord',
        config: { token: 'alias-tok' },
      });
      const config = baseConfig({ messageProfile: 'discomain' });
      applyMessageProfile(config);
      expect(config.discord?.token).toBe('alias-tok');
    });

    it('does not overwrite explicit env values (mergeMissing)', () => {
      getProfileMock.mockReturnValue({
        key: 'discomain',
        provider: 'discord',
        config: { botToken: 'profile-tok', channelId: 'profile-ch' },
      });
      const config = baseConfig({
        messageProfile: 'discomain',
        discord: { token: 'env-tok', channelId: '' } as BotConfig['discord'],
      });
      applyMessageProfile(config);
      expect(config.discord?.token).toBe('env-tok'); // explicit wins
      expect(config.discord?.channelId).toBe('profile-ch'); // empty filled
    });

    it('skips when profile has no token and bot has no discord section', () => {
      getProfileMock.mockReturnValue({
        key: 'discomain',
        provider: 'discord',
        config: { channelId: 'ch1' },
      });
      const config = baseConfig({ messageProfile: 'discomain' });
      applyMessageProfile(config);
      expect(config.discord).toBeUndefined();
    });
  });

  describe('slack mapping', () => {
    it('maps slack fields and socketMode=true → mode socket', () => {
      getProfileMock.mockReturnValue({
        key: 'slackmain',
        provider: 'slack',
        config: {
          botToken: 'xoxb-1',
          appToken: 'xapp-1',
          signingSecret: 'sig',
          joinChannels: 'C1,C2',
          channelId: 'C1',
          socketMode: true,
        },
      });
      const config = baseConfig({ messageProfile: 'slackmain', messageProvider: 'slack' });
      applyMessageProfile(config);
      expect(config.slack).toMatchObject({
        botToken: 'xoxb-1',
        appToken: 'xapp-1',
        signingSecret: 'sig',
        joinChannels: 'C1,C2',
        defaultChannelId: 'C1',
        mode: 'socket',
      });
    });

    it('socketMode=false → mode rtm; literal mode wins over socketMode', () => {
      getProfileMock.mockReturnValue({
        key: 'slackmain',
        provider: 'slack',
        config: { botToken: 'xoxb-1', socketMode: false, mode: 'socket' },
      });
      const config = baseConfig({ messageProfile: 'slackmain', messageProvider: 'slack' });
      applyMessageProfile(config);
      expect(config.slack?.mode).toBe('socket');

      getProfileMock.mockReturnValue({
        key: 'slackmain',
        provider: 'slack',
        config: { botToken: 'xoxb-1', socketMode: false },
      });
      const config2 = baseConfig({ messageProfile: 'slackmain', messageProvider: 'slack' });
      applyMessageProfile(config2);
      expect(config2.slack?.mode).toBe('rtm');
    });

    it('adopts slack provider when bot provider is default (not explicit)', () => {
      getProfileMock.mockReturnValue({
        key: 'slackmain',
        provider: 'slack',
        config: { botToken: 'xoxb-1' },
      });
      // convict defaults messageProvider to 'discord'
      const config = baseConfig({ messageProfile: 'slackmain', messageProvider: 'discord' });
      applyMessageProfile(config, { providerExplicit: false });
      expect(config.messageProvider).toBe('slack');
      expect(config.slack?.botToken).toBe('xoxb-1');
    });

    it('skips on provider mismatch when provider was explicit', () => {
      getProfileMock.mockReturnValue({
        key: 'slackmain',
        provider: 'slack',
        config: { botToken: 'xoxb-1' },
      });
      const config = baseConfig({ messageProfile: 'slackmain', messageProvider: 'discord' });
      applyMessageProfile(config, { providerExplicit: true });
      expect(config.messageProvider).toBe('discord');
      expect(config.slack).toBeUndefined();
    });
  });

  describe('mattermost mapping', () => {
    it('maps serverUrl/token/channel with aliases', () => {
      getProfileMock.mockReturnValue({
        key: 'mmmain',
        provider: 'mattermost',
        config: { serverUrl: 'https://mm.example', botToken: 'mm-tok', channelId: 'town-square' },
      });
      const config = baseConfig({ messageProfile: 'mmmain', messageProvider: 'mattermost' });
      applyMessageProfile(config);
      expect(config.mattermost).toMatchObject({
        serverUrl: 'https://mm.example',
        token: 'mm-tok',
        channel: 'town-square',
      });
    });
  });

  describe('telegram mapping', () => {
    it('maps botToken/chatId with aliases', () => {
      getProfileMock.mockReturnValue({
        key: 'tgmain',
        provider: 'telegram',
        config: { token: 'tg-tok', channelId: '-100123' },
      });
      const config = baseConfig({ messageProfile: 'tgmain', messageProvider: 'telegram' });
      applyMessageProfile(config);
      expect(config.telegram).toMatchObject({ botToken: 'tg-tok', chatId: '-100123' });
    });
  });
});
