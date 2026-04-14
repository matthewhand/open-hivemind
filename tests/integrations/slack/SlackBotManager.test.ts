import { SlackBotManager } from '@src/integrations/slack/SlackBotManager';
import { WebClient } from '@slack/web-api';
import { SocketModeClient } from '@slack/socket-mode';

// Mock Slack SDKs
jest.mock('@slack/web-api');
jest.mock('@slack/socket-mode');

describe('SlackBotManager', () => {
  let manager: SlackBotManager;
  let mockConfigs: any[];
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockConfigs = [
      {
        token: 'xoxb-test',
        appToken: 'xapp-test',
        name: 'test-bot',
      }
    ];

    mockHandler = jest.fn().mockResolvedValue('response');

    // Setup mocks
    (WebClient as jest.Mock).mockImplementation(() => ({
      auth: {
        test: jest.fn().mockResolvedValue({ user_id: 'U123', user: 'test-bot' }),
      },
      conversations: {
        history: jest.fn().mockResolvedValue({ messages: [] }),
      },
    }));

    (SocketModeClient as jest.Mock).mockImplementation(() => {
      let connectedHandler: Function | null = null;
      return {
        on: jest.fn((event, handler) => {
          if (event === 'connected') connectedHandler = handler;
        }),
        start: jest.fn().mockImplementation(async () => {
          if (connectedHandler) {
            // Trigger connected immediately to resolve initialize() promise
            connectedHandler();
          }
        }),
        stop: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
    });
  });

  afterEach(async () => {
    if (manager) {
      await manager.shutdown();
    }
    jest.useRealTimers();
  });

  it('should initialize and connect successfully', async () => {
    manager = new SlackBotManager(mockConfigs, 'socket');
    manager.setMessageHandler(mockHandler);

    await manager.initialize();

    expect(WebClient).toHaveBeenCalledWith('xoxb-test');
    expect(SocketModeClient).toHaveBeenCalledWith({ appToken: 'xapp-test' });
  });

  it('should handle incoming messages correctly', async () => {
    let messageHandler: Function = () => {};
    (SocketModeClient as jest.Mock).mockImplementation(() => {
      let connectedHandler: Function | null = null;
      return {
        on: jest.fn((event, handler) => {
          if (event === 'message') messageHandler = handler;
          if (event === 'connected') connectedHandler = handler;
        }),
        start: jest.fn().mockImplementation(async () => {
          if (connectedHandler) {
            connectedHandler();
          }
        }),
        stop: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
    });

    manager = new SlackBotManager(mockConfigs, 'socket');
    manager.setMessageHandler(mockHandler);
    await manager.initialize();

    // Simulate message event
    const mockEvent = {
      event: {
        type: 'message',
        text: 'hello bot',
        user: 'U456',
        channel: 'C789',
        channel_type: 'im',
        event_ts: '1234.56',
      },
      ack: jest.fn().mockResolvedValue(undefined),
    };

    await messageHandler(mockEvent);

    expect(mockHandler).toHaveBeenCalled();
    const [msg] = mockHandler.mock.calls[0];
    expect(msg.getText()).toBe('hello bot');
    expect(msg.getAuthorId()).toBe('U456');
  });

  it('should cleanup on shutdown', async () => {
    manager = new SlackBotManager(mockConfigs, 'socket');
    await manager.initialize();
    
    await manager.shutdown();
    
    const socketInstance = (SocketModeClient as jest.Mock).mock.results[0].value;
    expect(socketInstance.disconnect).toHaveBeenCalled();
  });
});
