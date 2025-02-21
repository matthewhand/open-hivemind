import { SlackEventListener } from '@integrations/slack/SlackEventListener'; // Use alias
import { SlackService } from '@integrations/slack/SlackService';
import { getLlmProvider } from '@llm/getLlmProvider'; // Use alias

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn().mockResolvedValue({}) },
  })),
}));

jest.mock('@llm/getLlmProvider', () => ({
  getLlmProvider: () => ({
    generateChatCompletion: jest.fn().mockResolvedValue('Hello with metadata!'), // Mock LLM response
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateCompletion: jest.fn().mockResolvedValue('Completed!'),
  }),
}));

describe('SlackEventListener with Metadata', () => {
  let listener: SlackEventListener;
  let slackService: SlackService;

  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.INCLUDE_SLACK_METADATA = 'true';
    slackService = SlackService.getInstance();
    listener = new SlackEventListener({} as any, {} as any, jest.fn());
    jest.spyOn(slackService, 'sendMessage').mockResolvedValue(undefined);
  });

  afterEach(() => {
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('includes metadata for message event', async () => {
    const event = { type: 'message', text: 'hi', channel: 'C123', user: 'U123', event_ts: '123' }; // Use event_ts
    await listener.handleEvent(event);
    expect(slackService.sendMessage).toHaveBeenCalledWith('C123', 'Hello with metadata!', 'Jeeves', '123');
  });
});
