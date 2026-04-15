import express from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';

// Mock webhookSecurity
jest.mock('../../src/webhook/security/webhookSecurity', () => ({
  verifyWebhookToken: (req: any, res: any, next: any) => next(),
  verifyIpWhitelist: (req: any, res: any, next: any) => next(),
  verifySlackSignature: (req: any, res: any, next: any) => next(),
}));

// Mock webhookConfig
jest.mock('../../src/config/webhookConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'WEBHOOK_TOKEN') return 'test-token';
    if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
    return undefined;
  }),
}));

// Mock Messenger services
const mockMessageService = {
  handleIncomingWebhook: jest.fn().mockResolvedValue({ success: true }),
  getDefaultChannel: jest.fn().mockReturnValue('C67890'),
  sendPublicAnnouncement: jest.fn().mockResolvedValue(true),
};

// Helper to spoof the source IP for testing whitelist logic
const spoofIp = (ip: string) => (req: any, res: any, next: any) => {
  req.ip = ip;
  req.ips = [ip];
  Object.defineProperty(req, 'ip', { value: ip, writable: true });
  next();
};

describe('Slack Webhook Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(spoofIp('127.0.0.1'));
    configureWebhookRoutes(app, mockMessageService as any);
  });

  it('should accept and process a standard Slack webhook', async () => {
    const payload = {
      event: {
        type: 'message',
        text: 'hello bot',
        user: 'U12345',
        channel: 'C67890',
        ts: '123456789.000001',
      },
    };

    const res = await request(app)
      .post('/webhook/slack')
      .set('X-Webhook-Token', 'test-token')
      .set('X-Slack-Signature', 'v0=valid-signature')
      .set('X-Slack-Request-Timestamp', String(Math.floor(Date.now() / 1000)))
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockMessageService.handleIncomingWebhook).toHaveBeenCalled();
  });

  it('should return 400 if text is missing', async () => {
    const res = await request(app)
      .post('/webhook/slack')
      .set('X-Webhook-Token', 'test-token')
      .send({ event: { type: 'message', user: 'U123' } });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Missing');
  });
});
