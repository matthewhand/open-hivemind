import { SlackBotManager } from '@hivemind/message-slack/SlackBotManager';
import { RTMClient } from '@slack/rtm-api';
import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';

jest.mock('@slack/socket-mode');
jest.mock('@slack/rtm-api');
jest.mock('@slack/web-api');

const MockSocketModeClient = SocketModeClient as jest.MockedClass<typeof SocketModeClient>;
const MockRTMClient = RTMClient as jest.MockedClass<typeof RTMClient>;
const MockWebClient = WebClient as jest.MockedClass<typeof WebClient>;

describe('SlackBotManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks for each test
    MockSocketModeClient.mockClear();
    MockRTMClient.mockClear();
    MockWebClient.mockClear();

    // Default mock implementations for WebClient auth.test
    MockWebClient.mockImplementation(
      () =>
        ({
          auth: {
            test: jest.fn(() => Promise.resolve({ user_id: 'U123', user: 'testuser' })),
          },
          conversations: {
            history: jest.fn(() => Promise.resolve({ messages: [] })),
          },
        }) as any
    );

    // Default mock implementations for SocketModeClient
    MockSocketModeClient.mockImplementation(
      () =>
        ({
          on: jest.fn(),
          start: jest.fn(() => Promise.resolve()),
        }) as any
    );

    // Default mock implementations for RTMClient
    MockRTMClient.mockImplementation(
      () =>
        ({
          start: jest.fn(() => Promise.resolve()),
        }) as any
    );
  });

  it('should handle initialization, configuration, and message handling', async () => {
    const mockConfigs = [
      {
        token: 'xoxb-bot-token',
        appToken: 'xapp-app-token',
        signingSecret: 'secret',
        name: 'testbot',
      },
    ];

    const manager = new SlackBotManager(mockConfigs, 'socket');
    const mockHandler = jest.fn().mockResolvedValue('bot response');
    manager.setMessageHandler(mockHandler);

    // Mock successful authentication
    const mockAuthTest = jest.fn().mockResolvedValue({
      ok: true,
      user_id: 'U12345',
      user: 'testbot',
    });

    MockWebClient.mockImplementation(
      () =>
        ({
          auth: {
            test: mockAuthTest,
          },
        }) as any
    );

    // Mock SocketModeClient
    let socketEventHandlers: Record<string, Function> = {};
    const mockSocketStart = jest.fn().mockImplementation(async () => {
      // Simulate connection success
      if (socketEventHandlers['connected']) {
        socketEventHandlers['connected']();
      }
    });

    MockSocketModeClient.mockImplementation(
      () =>
        ({
          on: jest.fn((event, handler) => {
            socketEventHandlers[event] = handler;
          }),
          start: mockSocketStart,
        }) as any
    );

    // Initialize
    await manager.initialize();

    expect(mockAuthTest).toHaveBeenCalled();
    expect(mockSocketStart).toHaveBeenCalled();

    // Simulate receiving a message
    if (socketEventHandlers['message']) {
      await socketEventHandlers['message']({
        event: {
          type: 'message',
          text: 'hello bot',
          user: 'U999',
          channel: 'C123',
          event_ts: '123456789.000001',
        },
      });
    }

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        getText: expect.any(Function),
      }),
      expect.any(Array),
      expect.objectContaining({ name: 'testbot' })
    );

    const receivedMessage = mockHandler.mock.calls[0][0];
    expect(receivedMessage.getText()).toBe('hello bot');
  });
});
