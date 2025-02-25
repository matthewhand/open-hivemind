import { SlackMessageProvider } from '@integrations/slack/providers/SlackMessageProvider';
import { SlackService } from '@integrations/slack/SlackService';
import { IMessage } from '@message/interfaces/IMessage';

// Mock Slack Web API
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: { history: jest.fn().mockResolvedValue({ messages: [{ text: 'test' }] }) },
  })),
}));

// Mock messageConfig
jest.mock('@src/config/messageConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'MadgwickAI' : undefined)),
  },
}));

// Mock slackConfig to mimic Convict configuration
jest.mock('@src/config/slackConfig', () => ({
  default: {
    get: jest.fn((key: string) => {
      const config = {
        SLACK_BOT_TOKEN: 'xoxb-test-token',
        SLACK_APP_TOKEN: 'xapp-test-token',
        SLACK_SIGNING_SECRET: 'test-secret',
        SLACK_JOIN_CHANNELS: 'C08BC0X4DFD',
        SLACK_DEFAULT_CHANNEL_ID: 'C08BC0X4DFD',
        SLACK_MODE: 'socket',
        SLACK_BOT_JOIN_CHANNEL_MESSAGE: '# Bot joined the {channel} channel! :robot_face:\n\nWelcome! I\'m here to assist. [Get Started](action:start_{channel})',
        SLACK_USER_JOIN_CHANNEL_MESSAGE: '# Welcome, {user}, to the {channel} channel! :wave:\n\nHere’s some quick info:\n- *Purpose*: General support...\n- *Resources*: [Learn More](https://example.com/resources)\n\n## Actions\n- [Tell me more about the learning objectives](action:tell_more_learning_objectives_{channel})\n- [Help (Load Webpage)](action:help_webpage_{channel})\n- [Contact Support](action:contact_support_{channel})',
        SLACK_BUTTON_MAPPINGS: '{"tell_more_learning_objectives_C08BC0X4DFD": "Tell me more about the learning objectives", "help_webpage_C08BC0X4DFD": "Help (Load Webpage)", "contact_support_C08BC0X4DFD": "Contact Support", "start_C08BC0X4DFD": "Get Started"}',
      };
      return config[key as keyof typeof config] || '';
    }),
  },
}));

class MockMessage implements IMessage {
  public content: string;
  public channelId: string;
  public data: any;
  public role: string;

  constructor(content: string) {
    this.content = content;
    this.channelId = 'mock-channel';
    this.data = content;
    this.role = 'user';
  }

  getText() { return this.content; }
  getMessageId() { return 'mock-id'; }
  getChannelId() { return this.channelId; }
  getChannelTopic() { return null; }
  getAuthorId() { return 'mock-author'; }
  getAuthorName() { return 'mock-user'; }
  getUserMentions() { return []; }
  getChannelUsers() { return []; }
  isFromBot() { return false; }
  isReplyToBot() { return false; }
  mentionsUsers(_userId: string) { return false; }
  setText(text: string) { this.content = text; }
  getTimestamp() { return new Date(); }
  getOriginalMessage() { return {} as any; }
  getReferencedMessage() { return Promise.resolve(null); }
}

describe('SlackMessageProvider', () => {
  let provider: SlackMessageProvider;

  beforeEach(() => {
    jest.resetModules(); // Clear module caches
    jest.resetAllMocks(); // Reset all mocks
    delete process.env.SLACK_USERNAME_OVERRIDE;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    (SlackService as any).instance = undefined;
    jest.spyOn(SlackService.prototype, 'fetchMessages').mockResolvedValue([new MockMessage('test')]);
    provider = new SlackMessageProvider();
  });

  afterEach(() => {
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it.skip('should fetch messages from SlackService', async () => {
    const messages = await provider.getMessages('test-channel');
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('test');
  });
});
