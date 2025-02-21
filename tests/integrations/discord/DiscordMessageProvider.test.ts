import { DiscordMessageProvider } from '@integrations/discord/providers/DiscordMessageProvider';

describe('DiscordMessageProvider', () => {
  it('should fetch messages from DiscordService', () => {
    const provider = new DiscordMessageProvider();
    return provider.getMessages('test-channel').then(messages => {
      expect(messages).toEqual([{ text: "Test message from Discord" }]); // Matches mock return
    });
  });
});
