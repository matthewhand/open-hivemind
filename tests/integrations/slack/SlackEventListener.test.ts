// SlackEventListener.test.ts
import { Request, Response, NextFunction } from 'express';
import { SlackEventListener } from '@integrations/slack/SlackEventListener';
import { SlackService } from '@integrations/slack/SlackService';

jest.mock('@integrations/slack/SlackService');

const mockSlackService = {
  sendMessage: jest.fn(),
  joinChannel: jest.fn(),
  slackClient: {
    chat: { postMessage: jest.fn() },
    conversations: {
      history: jest.fn(),
      join: jest.fn()
    }
  }
};

(SlackService.getInstance as jest.Mock).mockReturnValue(mockSlackService);

describe('SlackEventListener', () => {
  let slackServiceMock: jest.Mocked<SlackService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let listener: any;

  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = 'mock-token';
    process.env.SLACK_JOIN_CHANNELS = 'general';

    slackServiceMock = SlackService.getInstance() as jest.Mocked<SlackService>;

    mockRequest = {
      body: {}
    };

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    listener = new SlackEventListener(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle slack message events', async () => {
    const event = {
      type: 'message',
      channel: 'general',
      text: 'Hello'
    };

    await listener.handleEvent(event);

    expect(slackServiceMock.sendMessage).toHaveBeenCalledWith(
      'general',
      'You said: Hello'
    );
  });
});
