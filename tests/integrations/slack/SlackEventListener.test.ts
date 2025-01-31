import request from 'supertest';
import express from 'express';
import slackEventListener, { slackService } from '@integrations/slack/SlackEventListener';
import { SlackService } from '@integrations/slack/SlackService';

jest.mock('@integrations/slack/SlackService');

describe('SlackEventListener', () => {
  let app: express.Express;
  let slackServiceMock: jest.Mocked<SlackService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(slackEventListener);

    slackServiceMock = new SlackService() as jest.Mocked<SlackService>;
    slackServiceMock.sendMessage = jest.fn().mockResolvedValue(undefined);

    // Inject mock
    (slackService as any) = slackServiceMock;
  });

  test('should respond to Slack events', async () => {
    const response = await request(app)
      .post('/slack/events')
      .send({ event: { type: 'message', text: 'Hello', channel: 'general' } });

    expect(response.status).toBe(200);
    expect(slackServiceMock.sendMessage).toHaveBeenCalledWith('general', 'You said: Hello');
  });
});
