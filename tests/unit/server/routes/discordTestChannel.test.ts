import {
  pickDiscordMessenger,
  resolveDiscordTestChannelId,
  sendDiscordTestMessage,
} from '@src/server/routes/discordTestChannel';

describe('resolveDiscordTestChannelId', () => {
  const HOME = '1112523756720627712';

  it('prefers DISCORD_DEFAULT_CHANNEL_ID over DISCORD_CHANNEL_ID', () => {
    const resolved = resolveDiscordTestChannelId({
      DISCORD_DEFAULT_CHANNEL_ID: HOME,
      DISCORD_CHANNEL_ID: '999999999999999999',
    });
    expect(resolved).toBe(HOME);
  });

  it('falls back to DISCORD_CHANNEL_ID when default is unset', () => {
    const resolved = resolveDiscordTestChannelId({
      DISCORD_CHANNEL_ID: HOME,
    });
    expect(resolved).toBe(HOME);
  });

  it('prefers live messenger default over env when override is absent', () => {
    const resolved = resolveDiscordTestChannelId(
      { DISCORD_DEFAULT_CHANNEL_ID: 'env-default', DISCORD_CHANNEL_ID: 'env-legacy' },
      undefined,
      HOME
    );
    expect(resolved).toBe(HOME);
  });

  it('prefers an explicit override over live default and env', () => {
    const resolved = resolveDiscordTestChannelId(
      {
        DISCORD_DEFAULT_CHANNEL_ID: HOME,
        DISCORD_CHANNEL_ID: HOME,
      },
      '222222222222222222',
      HOME
    );
    expect(resolved).toBe('222222222222222222');
  });

  it('trims whitespace from env and override values', () => {
    expect(resolveDiscordTestChannelId({ DISCORD_DEFAULT_CHANNEL_ID: `  ${HOME}  ` })).toBe(HOME);
    expect(resolveDiscordTestChannelId({}, `  ${HOME}  `)).toBe(HOME);
  });

  it('returns null when no channel is configured (no silent hardcode)', () => {
    expect(resolveDiscordTestChannelId({})).toBeNull();
    expect(resolveDiscordTestChannelId({ DISCORD_DEFAULT_CHANNEL_ID: '   ' })).toBeNull();
    expect(resolveDiscordTestChannelId({}, '')).toBeNull();
    expect(resolveDiscordTestChannelId({}, null)).toBeNull();
  });

  it('matches live .env home-channel convention used by DiscordService default', () => {
    // Structural proof: same env key DiscordService.getDefaultChannel reads
    // (DISCORD_DEFAULT_CHANNEL_ID) is a resolution key here.
    const env = { DISCORD_DEFAULT_CHANNEL_ID: HOME };
    expect(resolveDiscordTestChannelId(env)).toBe(env.DISCORD_DEFAULT_CHANNEL_ID);
  });
});

describe('pickDiscordMessenger + sendDiscordTestMessage', () => {
  it('picks the Discord service from a mixed messenger list', () => {
    const discord = {
      providerName: 'discord',
      sendMessageToChannel: jest.fn(),
    };
    const slack = { provider: 'slack', sendMessageToChannel: jest.fn() };
    expect(pickDiscordMessenger([slack, discord])).toBe(discord);
    expect(pickDiscordMessenger([slack])).toBeNull();
  });

  it('sends via the live messenger sendMessageToChannel path', async () => {
    const sendMessageToChannel = jest.fn().mockResolvedValue('msg-42');
    const id = await sendDiscordTestMessage(
      { providerName: 'discord', sendMessageToChannel },
      '1112523756720627712',
      'hello'
    );
    expect(id).toBe('msg-42');
    expect(sendMessageToChannel).toHaveBeenCalledWith('1112523756720627712', 'hello');
  });

  it('falls back to sendMessage when sendMessageToChannel is absent', async () => {
    const sendMessage = jest.fn().mockResolvedValue('legacy-id');
    const id = await sendDiscordTestMessage(
      { provider: 'discord', sendMessage },
      '1112523756720627712',
      'hello'
    );
    expect(id).toBe('legacy-id');
    expect(sendMessage).toHaveBeenCalledWith('1112523756720627712', 'hello');
  });
});
