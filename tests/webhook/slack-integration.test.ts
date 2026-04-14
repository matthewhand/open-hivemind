import express from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';

// Set actual environment variables that convict uses
process.env.WEBHOOK_TOKEN = 'test-token';
process.env.WEBHOOK_IP_WHITELIST = '127.0.0.1';

// Helper to spoof the source IP for testing whitelist logic
const spoofIp = (ip: string) => (req: any, res: any, next: any) => {
  req.ip = ip;
  req.connection = req.connection || {};
  Object.defineProperty(req.connection, 'remoteAddress', {
    value: ip,
    configurable: true,
  });
  next();
};

describe('Slack Webhook Integration', () => {
  let app: express.Application;
  let mockMessageService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(spoofIp('127.0.0.1'));

    mockMessageService = {
      handleIncomingWebhook: jest.fn().mockResolvedValue({ success: true }),
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
      getDefaultChannel: jest.fn().mockReturnValue('general'),
    };

    configureWebhookRoutes(app, mockMessageService, 'test-channel');
  });

  it('should accept and process a standard Slack webhook', async () => {
    const payload = {
      text: 'Hello from Slack',
      username: 'SlackUser',
      attachments: [{ text: 'Extra info' }],
    };

    const res = await request(app)
      .post('/webhook/slack')
      .set('X-Webhook-Token', 'test-token')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockMessageService.handleIncomingWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello from Slack\n\nExtra info',
        username: 'SlackUser',
      }),
      'test-channel'
    );
  });

  it('should return 400 if text is missing (fallback path)', async () => {
    const fallbackApp = express();
    fallbackApp.use(express.json());
    fallbackApp.use(spoofIp('127.0.0.1'));
    const fallbackService: any = {
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
      getDefaultChannel: jest.fn().mockReturnValue('general'),
    };
    configureWebhookRoutes(fallbackApp, fallbackService, 'test-channel');

    const res = await request(fallbackApp)
      .post('/webhook/slack')
      .set('X-Webhook-Token', 'test-token')
      .send({ username: 'NoText' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing');
  });
});
