import { SlackBotManager } from '@src/integrations/slack/SlackBotManager';
import { WebClient } from '@slack/web-api';
import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';

// Silence debug logs during tests
jest.mock('debug', () => () => jest.fn());

// Use a shared mock object defined in a way that avoids hoisting issues
(global as any).mockSlackFunctions = {
  authTest: jest.fn(() => Promise.resolve({ user_id: 'U123', user: 'testuser' })),
  history: jest.fn(() => Promise.resolve({ messages: [] })),
};

// Mock Slack SDKs
const mockAuthTest = jest.fn().mockResolvedValue({ user_id: 'U123', user: 'testuser' });
const mockConversationsHistory = jest.fn().mockResolvedValue({ messages: [] });

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: {
      test: mockAuthTest,
    },
    conversations: {
      history: mockConversationsHistory,
    },
  })),
}));

jest.mock('@slack/socket-mode', () => ({
  SocketModeClient: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@slack/rtm-api', () => ({
  RTMClient: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
  })),
}));

const MockWebClient = WebClient as jest.MockedClass<typeof WebClient>;
const MockSocketModeClient = SocketModeClient as jest.MockedClass<typeof SocketModeClient>;

describe('SlackBotManager', () => {
  const mockConfigs = [
    {
      token: 'test-token',
      appToken: 'test-app-token',
      signingSecret: 'test-signing-secret',
      name: 'testbot',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle initialization, configuration, and message handling', async () => {
    // Setup mock event handlers for SocketModeClient
    const socketEventHandlers: Record<string, Function> = {};
    MockSocketModeClient.mockImplementation(
      () =>
        ({
          on: jest.fn((event, handler) => {
            console.log(`DEBUG: Registering handler for ${event}`);
            socketEventHandlers[event] = handler;
          }),
          start: jest.fn(async () => {
            console.log('DEBUG: SocketModeClient.start called');
            // Simulate connection success
            if (socketEventHandlers['connected']) {
              console.log('DEBUG: Simulating connected event');
              setTimeout(() => socketEventHandlers['connected'](), 0);
            }
            return Promise.resolve();
          }),
        }) as any
    );

    const manager = new SlackBotManager(mockConfigs as any, 'socket');
    const mockHandler = jest.fn().mockResolvedValue('bot response');
    manager.setMessageHandler(mockHandler);

    // Initialize
    await manager.initialize();
    console.log('DEBUG: manager.initialize completed');
    
    // Check that auth.test was called on the web client
    expect(mockAuthTest).toHaveBeenCalled();
    expect(MockSocketModeClient).toHaveBeenCalled();

    // Simulate receiving a message
    if (socketEventHandlers['message']) {
      console.log('DEBUG: Simulating message event');
      await socketEventHandlers['message']({
        event: {
          type: 'message',
          channel_type: 'im',
          text: 'hello',
          user: 'U999', // Different from bot user U123
          channel: 'C123',
          event_ts: '123456789.000001',
        },
      });
    } else {
      console.log('DEBUG: NO message handler registered!');
    }

    // Give some time for async message handling
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockHandler).toHaveBeenCalled();
    const handlerCall = mockHandler.mock.calls[0];
    // Check that first arg has a getText method that returns 'hello'
    expect(handlerCall[0].getText()).toBe('hello');
    // Check that bot info is passed as 3rd arg
    expect(handlerCall[2]).toMatchObject({ name: 'testbot' });
  });
});
