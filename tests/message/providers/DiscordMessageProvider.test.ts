import { DiscordMessageProvider } from '@message/providers/DiscordMessageProvider';

describe('DiscordMessageProvider', () => {
  let discordProvider: DiscordMessageProvider;

  beforeEach(() => {
    discordProvider = new DiscordMessageProvider();
  });

  test('should be instantiated properly', () => {
    expect(discordProvider).toBeInstanceOf(DiscordMessageProvider);
  });

  test('should send messages', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await discordProvider.sendMessage('123', 'Hello Discord!');
    expect(consoleSpy).toHaveBeenCalledWith('Sending message to Discord channel 123: Hello Discord!');
    consoleSpy.mockRestore();
  });

  test('should return test messages', async () => {
    const messages = await discordProvider.getMessages('123');
    expect(messages).toEqual([{ text: 'Test message from Discord' }]);
  });

  test('should return the correct client ID', () => {
    expect(discordProvider.getClientId()).toBe('discord-bot');
  });
});
