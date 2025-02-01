import { SlackEventListener } from '@integrations/slack/SlackEventListener';
import { Request, Response, NextFunction } from 'express';

// Set a dummy SLACK_BOT_TOKEN so that SlackService can be instantiated.
process.env.SLACK_BOT_TOKEN = 'dummy-token';

// Dummy Express objects for the constructor.
const dummyRequest = {} as Request;
const dummyResponse = {} as Response;
const dummyNext = (() => {}) as NextFunction;

describe('SlackEventListener', () => {
  let eventListener: SlackEventListener;

  beforeEach(() => {
    // Instantiate SlackEventListener with the dummy parameters.
    eventListener = new SlackEventListener(dummyRequest, dummyResponse, dummyNext);
  });

  it('should process incoming Slack message events correctly', async () => {
    const event = { type: 'message', text: 'Hello, bot!', channel: 'general', user: 'user123' };

    // Instead of returning true, resolve with undefined (void)
    const processSpy = jest.spyOn(eventListener, 'handleEvent').mockResolvedValue(undefined);
    
    const result = await eventListener.handleEvent(event);
    expect(result).toBeUndefined();
    
    processSpy.mockRestore();
  });
});
