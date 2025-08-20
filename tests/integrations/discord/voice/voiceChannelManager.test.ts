import { VoiceChannelManager } from '@src/integrations/discord/voice/voiceChannelManager';
import { Client } from 'discord.js';
import { VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';

jest.mock('@src/integrations/discord/interaction/connectToVoiceChannel');
jest.mock('@src/integrations/discord/voice/voiceCommandHandler');
jest.mock('@src/integrations/discord/voice/voiceActivityDetection');

describe('VoiceChannelManager', () => {
  let manager: VoiceChannelManager;
  let mockClient: jest.Mocked<Client>;
  let mockConnection: jest.Mocked<VoiceConnection>;

  beforeEach(() => {
    mockClient = {} as jest.Mocked<Client>;
    mockConnection = {
      on: jest.fn(),
      destroy: jest.fn()
    } as any;

    manager = new VoiceChannelManager(mockClient);

    const { connectToVoiceChannel } = require('@src/integrations/discord/interaction/connectToVoiceChannel');
    connectToVoiceChannel.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should join channel successfully', async () => {
    const channelId = '123456789';
    
    const connection = await manager.joinChannel(channelId);
    
    expect(connection).toBe(mockConnection);
    expect(manager.getActiveChannels()).toContain(channelId);
  });

  it('should return existing connection for same channel', async () => {
    const channelId = '123456789';
    
    const connection1 = await manager.joinChannel(channelId);
    const connection2 = await manager.joinChannel(channelId);
    
    expect(connection1).toBe(connection2);
  });

  it('should leave channel and cleanup', () => {
    const channelId = '123456789';
    
    manager.leaveChannel(channelId);
    
    expect(mockConnection.destroy).toHaveBeenCalled();
  });

  it('should leave all channels', async () => {
    await manager.joinChannel('123');
    await manager.joinChannel('456');
    
    manager.leaveAllChannels();
    
    expect(mockConnection.destroy).toHaveBeenCalledTimes(2);
    expect(manager.getActiveChannels()).toHaveLength(0);
  });

  it('should handle connection disconnect', async () => {
    const channelId = '123456789';
    await manager.joinChannel(channelId);
    
    const disconnectCallback = mockConnection.on.mock.calls.find(
      call => call[0] === VoiceConnectionStatus.Disconnected
    )?.[1];
    
    disconnectCallback?.();
    
    expect(manager.getActiveChannels()).not.toContain(channelId);
  });
});