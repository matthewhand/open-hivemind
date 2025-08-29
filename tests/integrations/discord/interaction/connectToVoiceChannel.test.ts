import { connectToVoiceChannel } from '@src/integrations/discord/interaction/connectToVoiceChannel';
import { Client, VoiceChannel } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';

jest.mock('@discordjs/voice');
jest.mock('discord.js');

describe.skip('connectToVoiceChannel', () => {
  let mockClient: jest.Mocked<Client>;
  let mockChannel: jest.Mocked<VoiceChannel>;
  let mockConnection: any;

  beforeEach(() => {
    mockChannel = {
      id: '123456789',
      guild: {
        id: 'guild123',
        voiceAdapterCreator: jest.fn()
      },
      isVoiceBased: jest.fn().mockReturnValue(true)
    } as any;

    mockClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      }
    } as any;

    mockConnection = {
      on: jest.fn()
    };

    (joinVoiceChannel as jest.Mock).mockReturnValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to voice channel successfully', async () => {
    mockConnection.on.mockImplementation((event: string, callback: Function) => {
      if (event === VoiceConnectionStatus.Ready) {
        setTimeout(() => callback(), 0);
      }
    });

    const connection = await connectToVoiceChannel(mockClient, '123456789');

    expect(mockClient.channels.fetch).toHaveBeenCalledWith('123456789');
    expect(joinVoiceChannel).toHaveBeenCalledWith({
      channelId: '123456789',
      guildId: 'guild123',
      adapterCreator: expect.any(Function)
    });
    expect(connection).toBe(mockConnection);
  });

  it('should throw error for non-voice channel', async () => {
    mockChannel.isVoiceBased.mockReturnValue(false);

    await expect(connectToVoiceChannel(mockClient, '123456789'))
      .rejects.toThrow('Channel 123456789 is not a voice channel');
  });

  it('should handle connection timeout', async () => {
    mockConnection.on.mockImplementation(() => {});

    await expect(connectToVoiceChannel(mockClient, '123456789'))
      .rejects.toThrow('Voice connection timeout');
  });
});