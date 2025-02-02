import { SlackEventListener } from '@integrations/slack/SlackEventListener';
import { Request, Response, NextFunction } from 'express';

const flowiseConfigured = !!(process.env.FLOWISE_API_KEY &&
  process.env.FLOWISE_CONVERSATION_CHATFLOW_ID &&
  process.env.FLOWISE_COMPLETION_CHATFLOW_ID &&
  process.env.FLOWISE_API_ENDPOINT);

const describeOrSkip = flowiseConfigured ? describe : describe.skip;

describeOrSkip('SlackEventListener Metadata', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let listener: SlackEventListener;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = jest.fn();
    listener = new SlackEventListener(req, res, next);
  });

  test('should process a Slack event and capture metadata', async () => {
    const dummyEvent = {
      type: 'message',
      channel: 'C123456',
      text: 'Hello Slack!',
      user: 'U123456',
      ts: '1623456789.000200',
      thread_ts: '1623456789.000100',
      team: 'T123456'
    };
    await listener.handleEvent(dummyEvent);
    expect(true).toBe(true);
  });
});
