jest.mock('discord.js', () => {
  const originalModule = jest.requireActual('discord.js');

  const MockClient = jest.fn().mockImplementation(() => ({
      login: jest.fn(),
      once: jest.fn(),
      on: jest.fn(),
      channels: {
          fetch: jest.fn(),
      },
      destroy: jest.fn().mockResolvedValue(undefined),
      user: { id: 'bot-user-id', tag: 'Bot#1234' },
  }));

  return {
      ...originalModule,
      Client: MockClient,
      TextChannel: jest.fn(),
      DMChannel: jest.fn(),
      GatewayIntentBits: originalModule.GatewayIntentBits,
  };
});
jest.mock('@src/integrations/discord/DiscordMessage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@src/message/common/chatHistory', () => ({
  ChatHistory: {
      getInstance: jest.fn().mockReturnValue({
          addMessage: jest.fn(),
          getRecentMessages: jest.fn().mockReturnValue([]),
      }),
  },
}));

jest.mock('@message/interfaces/messageConfig', () => ({
  __esModule: true,
  default: {
      get: jest.fn(),
  },
}));

jest.mock('@integrations/discord/interfaces/discordConfig', () => ({
  __esModule: true,
  default: {
      get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
              case 'DISCORD_BOT_TOKEN':
                  return 'fake-token';
              case 'DISCORD_CHANNEL_ID':
                  return 'test-channel-id';
              case 'DISCORD_LOGGING_ENABLED':
                  return false;
              default:
                  return undefined;
          }
      }),
  },
}));

import { DiscordService } from '@integrations/discord/DiscordService';
import { Client, TextChannel, DMChannel, GatewayIntentBits } from 'discord.js';
import { IMessage } from '@message/interfaces/IMessage';
import messageConfig from '@message/interfaces/messageConfig';

describe('DiscordService', () => {
  let discordService: DiscordService;
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
      jest.clearAllMocks();
      discordService = DiscordService.getInstance();
      mockClient = (discordService.client as unknown) as jest.Mocked<Client>;
  });

  test('should implement singleton pattern', () => {
      const anotherInstance = DiscordService.getInstance();
      expect(discordService).toBe(anotherInstance);
  });

  // test('should initialize Discord client with correct intents', async () => {
  //     await discordService.initialize('fake-token');
  //     expect(Client).toHaveBeenCalledWith({
  //         intents: [
  //             GatewayIntentBits.Guilds,
  //             GatewayIntentBits.GuildMessages,
  //             GatewayIntentBits.GuildVoiceStates,
  //             GatewayIntentBits.MessageContent,
  //         ],
  //     });
  //     expect(mockClient.login).toHaveBeenCalledWith('fake-token');
  // });

  // test('should throw error if DISCORD_BOT_TOKEN is not set', async () => {
  //     (messageConfig.get as jest.Mock).mockReturnValueOnce(undefined);
  //     await expect(discordService.initialize()).rejects.toThrow('DISCORD_BOT_TOKEN is not set');
  // });

  describe('sendMessageToChannel', () => {
      let mockChannel: jest.Mocked<TextChannel | DMChannel>;

      beforeEach(() => {
          mockChannel = {
              send: jest.fn(),
          } as unknown as jest.Mocked<TextChannel | DMChannel>;
          (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce(mockChannel);
      });

      // test('should send message to specified channel', async () => {
      //     await discordService.sendMessageToChannel('channel-id', 'Hello World');
      //     expect(mockClient.channels.fetch).toHaveBeenCalledWith('channel-id');
      //     expect(mockChannel.send).toHaveBeenCalledWith('Hello World');
      // });

      test('should throw error for unsupported channel types', async () => {
          (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce({} as any);
          await expect(
              discordService.sendMessageToChannel('channel-id', 'Hello World')
          ).rejects.toThrow('Unsupported channel type.');
      });

      // test('should handle errors when sending message', async () => {
      //     (mockChannel.send as jest.Mock).mockRejectedValueOnce(new Error('Send failed'));
      //     await expect(
      //         discordService.sendMessageToChannel('channel-id', 'Hello World')
      //     ).rejects.toThrow('Send failed');
      // });
  });

  describe('getMessagesFromChannel', () => {
      let mockChannel: jest.Mocked<TextChannel | DMChannel>;
      let mockMessages: any;

      beforeEach(() => {
          mockMessages = {
              map: jest.fn().mockReturnValue([]),
          };
          mockChannel = {
              messages: {
                  fetch: jest.fn().mockResolvedValueOnce(mockMessages),
              },
          } as unknown as jest.Mocked<TextChannel | DMChannel>;
          (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce(mockChannel);
      });

      // test('should fetch messages from specified channel with default limit', async () => {
      //     await discordService.getMessagesFromChannel('channel-id');
      //     expect(mockClient.channels.fetch).toHaveBeenCalledWith('channel-id');
      //     expect(mockChannel.messages.fetch).toHaveBeenCalledWith({ limit: 10 });
      //     expect(mockMessages.map).toHaveBeenCalled();
      // });

      // test('should fetch messages with specified limit', async () => {
      //     await discordService.getMessagesFromChannel('channel-id', 5);
      //     expect(mockClient.channels.fetch).toHaveBeenCalledWith('channel-id');
      //     expect(mockChannel.messages.fetch).toHaveBeenCalledWith({ limit: 5 });
      // });

      test('should throw error for unsupported channel types', async () => {
          (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce({} as any);
          await expect(
              discordService.getMessagesFromChannel('channel-id')
          ).rejects.toThrow('Unsupported channel type.');
      });

      // test('should handle errors when fetching messages', async () => {
      //     (mockChannel.messages.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
      //     await expect(
      //         discordService.getMessagesFromChannel('channel-id')
      //     ).rejects.toThrow('Fetch failed');
      // });
  });

  describe('Rate Limiting', () => {
      beforeEach(() => {
          (messageConfig.get as jest.Mock).mockReturnValue(5);
      });

      test('should not be rate limited initially', () => {
          expect((discordService as any).isRateLimited('channel-id')).toBe(false);
      });

      test('should be rate limited after reaching limit', () => {
          const channelId = 'channel-id';
          for (let i = 0; i < 5; i++) {
              (discordService as any).recordMessageTimestamp(channelId);
          }
          expect((discordService as any).isRateLimited(channelId)).toBe(true);
      });

      // test('should not be rate limited after time passes', () => {
      //     const channelId = 'channel-id';
      //     const originalDateNow = Date.now;

      //     jest.spyOn(Date, 'now')
      //         .mockReturnValueOnce(1000000)
      //         .mockReturnValueOnce(1002000)
      //         .mockReturnValueOnce(1004000)
      //         .mockReturnValueOnce(1006000)
      //         .mockReturnValueOnce(1008000)
      //         .mockReturnValue(1010000);

      //     for (let i = 0; i < 5; i++) {
      //         (discordService as any).recordMessageTimestamp(channelId);
      //     }

      //     expect((discordService as any).isRateLimited(channelId)).toBe(false);

      //     // Restore original Date.now
      //     (Date.now as jest.Mock).mockRestore();
      // });
  });
});