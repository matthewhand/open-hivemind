import { SlackEventListener } from '../../../src/integrations/slack/SlackEventListener';
import { SlackService } from '../../../src/integrations/slack/SlackService';
import { getLlmProvider } from '../../../src/llm/getLlmProvider'; // Fixed import path

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn().mockResolvedValue({}) },
  })),
}));

jest.mock('../../../src/llm/getLlmProvider', () => ({
  getLlmProvider: () => ({
    generateChatCompletion: jest.fn().mockResolvedValue('Hello back!'), // Mock LLM response
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateCompletion: jest.fn().mockResolvedValue('Completed!'),
  }),
}));

describe('SlackEventListener', () => {
  let listener: SlackEventListener;
  let slackService: SlackService;

  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    slackService = SlackService.getInstance();
    listener = new SlackEventListener({} as any, {} as any, jest.fn());
    jest.spyOn(slackService, 'sendMessage').mockResolvedValue(undefined);
  });

  afterEach(() => {
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('handles message event', async () => {
    const event = { type: 'message', text: 'hi', channel: 'C123', event_ts: '123' };
    await listener.handleEvent(event);
    expect(slackService.sendMessage).toHaveBeenCalledWith('C123', 'Hello back!', 'Jeeves', '123');
  });
});
