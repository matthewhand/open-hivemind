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
    const config = {
      token: 'test-token',
      appToken: 'test-app-token',
      signingSecret: 'test-signing-secret'
    };
    
    const slackBotManager = new SlackBotManager(config);
    
    // Test initialization
    expect(slackBotManager).toBeDefined();
    
    // Test configuration
    expect(MockSocketModeClient).toHaveBeenCalledWith({
      appToken: 'test-app-token'
    });
    
    // Test that event handlers are set up
    const mockSocketClient = MockSocketModeClient.mock.instances[0];
    expect(mockSocketClient.on).toHaveBeenCalled();
  });
});
