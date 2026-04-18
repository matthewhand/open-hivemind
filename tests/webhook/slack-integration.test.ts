import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';

// Define mock config inside hoisted mock factory
jest.mock('../../src/config/webhookConfig', () => {
  const mockInstance = {
    get: jest.fn((key) => {
      if (key === 'WEBHOOK_TOKEN') return 'test-token';
      if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
      if (key === 'WEBHOOK_ENABLED') return true;
      return '';
    }),
    validate: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockInstance,
  };
});

// Helper to spoof the source IP for testing whitelist logic
const spoofIp = (ip: string) => (req: any, res: any, next: any) => {
  Object.defineProperty(req, 'ip', {
    value: ip,
    configurable: true,
  });
  // Ensure Slack signature verification is skipped
  process.env.SLACK_SIGNING_SECRET = '';
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
    jest.clearAllMocks();

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
  });

  it('should return 400 if text is missing (fallback path)', async () => {
    const fallbackService: any = {
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
      getDefaultChannel: jest.fn().mockReturnValue('general'),
    };

    const fallbackApp = express();
    fallbackApp.use(express.json());
    fallbackApp.use(spoofIp('127.0.0.1'));
    configureWebhookRoutes(fallbackApp, fallbackService, 'test-channel');

    const res = await request(fallbackApp)
      .post('/webhook/slack')
      .set('X-Webhook-Token', 'test-token')
      .send({ username: 'NoText' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing');
  });
});
