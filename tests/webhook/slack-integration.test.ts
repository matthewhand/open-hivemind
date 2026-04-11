import express from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';

// Mock deep dependencies
jest.mock('@src/message/helpers/processing/handleImageMessage', () => ({
  predictionImageMap: new Map(),
}));
jest.mock('@common/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@config/webhookConfig', () => {
  const store: Record<string, any> = {
    WEBHOOK_TOKEN: 'test-token',
    WEBHOOK_IP_WHITELIST: '127.0.0.1',
  };
  return { __esModule: true, default: { get: (key: string) => store[key] } };
});

function spoofIp(ip: string) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.defineProperty(req, 'ip', { value: ip, writable: true, configurable: true });
    next();
  };
}

describe('Slack Webhook Integration', () => {
  let app: express.Application;
  let mockMessageService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(spoofIp('127.0.0.1'));

    mockMessageService = {
      handleIncomingWebhook: jest.fn().mockResolvedValue('Processed'),
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
    expect(mockMessageService.handleIncomingWebhook).toHaveBeenCalledWith(payload, 'test-channel');
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
