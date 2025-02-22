import { SlackMessageProvider } from '@integrations/slack/providers/SlackMessageProvider';
import { SlackService } from '@integrations/slack/SlackService';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
  })),
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
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    (SlackService as any).instance = undefined;
    jest.spyOn(SlackService.prototype, 'fetchMessages').mockResolvedValue([new MockMessage('test')]);
    provider = new SlackMessageProvider();
  });

  afterEach(() => {
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('should fetch messages from SlackService', async () => {
    const messages = await provider.getMessages('test-channel');
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('test');
  });
});
