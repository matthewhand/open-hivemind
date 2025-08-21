import { SlackBotManager } from '@src/integrations/slack/SlackBotManager';

jest.mock('@slack/socket-mode');
jest.mock('@slack/rtm-api');
jest.mock('@slack/web-api');

describe('SlackBotManager Comprehensive', () => {
  let manager: SlackBotManager;
  let mockInstances: any[];

  beforeEach(() => {
    mockInstances = [{
      token: 'xoxb-test-token',
      name: 'TestBot',
      signingSecret: 'test-secret'
    }];
    
    manager = new SlackBotManager(mockInstances, 'socket');
  });

  it('should initialize with socket mode', async () => {
    await manager.initialize();
    
    const bots = manager.getAllBots();
    expect(bots).toHaveLength(1);
    expect(bots[0].botUserName).toBe('TestBot');
  });

  it('should initialize with RTM mode', async () => {
    manager = new SlackBotManager(mockInstances, 'rtm');
    await manager.initialize();
    
    const bots = manager.getAllBots();
    expect(bots).toHaveLength(1);
  });

  it('should set message handler for all bots', () => {
    const mockHandler = jest.fn();
    
    manager.setMessageHandler(mockHandler);
    
    expect(manager['messageHandler']).toBe(mockHandler);
  });

  it('should handle bot authentication errors', async () => {
    const { SocketModeClient } = require('@slack/socket-mode');
    SocketModeClient.mockImplementation(() => ({
      start: jest.fn().mockRejectedValue(new Error('Auth failed')),
      on: jest.fn()
    }));

    await expect(manager.initialize()).rejects.toThrow('Auth failed');
  });

  it('should handle multiple bot instances', async () => {
    const multiInstances = [
      { token: 'token1', name: 'Bot1', signingSecret: 'secret1' },
      { token: 'token2', name: 'Bot2', signingSecret: 'secret2' }
    ];
    
    manager = new SlackBotManager(multiInstances, 'socket');
    await manager.initialize();
    
    const bots = manager.getAllBots();
    expect(bots).toHaveLength(2);
    expect(bots[0].botUserName).toBe('Bot1');
    expect(bots[1].botUserName).toBe('Bot2');
  });

  it('should shutdown all connections', async () => {
    const mockDisconnect = jest.fn();
    manager['bots'] = [{
      socketClient: { disconnect: mockDisconnect },
      rtmClient: { disconnect: mockDisconnect }
    } as any];

    await manager.shutdown();

    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });

  it('should handle message events', async () => {
    const mockHandler = jest.fn();
    manager.setMessageHandler(mockHandler);
    
    const mockMessage = {
      text: 'Hello bot',
      channel: 'C123',
      user: 'U123',
      ts: '1234567890.123456'
    };

    // Simulate message event
    await manager['handleMessage'](mockMessage, {});

    expect(mockHandler).toHaveBeenCalled();
  });
});