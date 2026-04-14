/**
 * Webhook Routes Integration Tests
 *
 * Tests the Express webhook routes (POST /webhook, /webhook/message, /webhook/slack)
 * with real security middleware, validation, and concurrency handling.
 *
 * This replaces the old 175-line file that was entirely `describe.skip`
 * and never executed a single assertion.
 */
import express from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';

// ---------------------------------------------------------------------------
// Mock config + messenger
// ---------------------------------------------------------------------------

jest.mock('@config/webhookConfig', () => ({
  get: jest.fn(),
}));

const mockConfig = require('@config/webhookConfig');

function makeApp() {
  const app = express();
  app.use(express.json());

  const messageService = {
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getDefaultChannel: jest.fn().mockReturnValue('general'),
  };

  configureWebhookRoutes(app, messageService as any);

  return { app, messageService };
}

function validTokenConfig() {
  mockConfig.get.mockImplementation((key: string) => {
    if (key === 'WEBHOOK_TOKEN') return 'secret-token';
    if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
    return '';
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Webhook Routes Integration', () => {
  let app: express.Application;
  let messageService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ app, messageService } = makeApp());
    validTokenConfig();
  });

  // ---- POST /webhook ----

  describe('POST /webhook', () => {
    it('should block when token is missing', async () => {
      const res = await request(app)
        .post('/webhook')
        .send({ id: 'pred-1', status: 'succeeded', output: [] });

      expect(res.status).toBe(403);
      expect(res.text).toBe('Forbidden: Invalid token');
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('should block when token is invalid', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'wrong-token')
        .send({ id: 'pred-1', status: 'succeeded', output: [] });

      expect(res.status).toBe(403);
      expect(res.text).toBe('Forbidden: Invalid token');
    });

    it('should block when IP is not whitelisted', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '10.0.0.1';
        return '';
      });

      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-1', status: 'succeeded', output: [] });

      // 127.0.0.1 is not in 10.0.0.1 whitelist
      expect(res.status).toBe(403);
      expect(res.text).toBe('Forbidden: Unauthorized IP address');
    });

    it('should process valid webhook and announce to channel', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-1', status: 'succeeded', output: ['Hello', 'World'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.processed).toBe('pred-1');
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Hello')
      );
    });

    it('should reject missing prediction ID', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ status: 'succeeded' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid request body');
      expect(res.body.details.some((d: string) => d.includes('Missing or invalid "id" field'))).toBe(true);
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-1', status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: string) => d.includes('Invalid status "invalid-status"'))).toBe(true);
    });

    it('should reject output arrays exceeding 10 items', async () => {
      const largeOutput = Array.from({ length: 11 }).map((_, i) => `item-${i}`);
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-1', status: 'succeeded', output: largeOutput });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('"output" array cannot contain more than 10 items');
    });

    it('should reject payloads with malicious content', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-1', status: 'succeeded', text: '<script>alert("xss")</script>' });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Request contains potentially malicious content');
    });

    it('should handle failed prediction status', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-webhook-token', 'secret-token')
        .send({ id: 'pred-2', status: 'failed' });

      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('failed')
      );
    });
  });

  // ---- POST /webhook/message ----

  describe('POST /webhook/message', () => {
    it('should broadcast text to channel', async () => {
      const res = await request(app)
        .post('/webhook/message')
        .set('x-webhook-token', 'secret-token')
        .send({ text: 'Hello from webhook' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        'Hello from webhook'
      );
    });

    it('should accept "message" field as alternative', async () => {
      const res = await request(app)
        .post('/webhook/message')
        .set('x-webhook-token', 'secret-token')
        .send({ message: 'Alternative field' });

      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        'Alternative field'
      );
    });

    it('should accept "content" field as alternative', async () => {
      const res = await request(app)
        .post('/webhook/message')
        .set('x-webhook-token', 'secret-token')
        .send({ content: 'Content field' });

      expect(res.status).toBe(200);
    });

    it('should return 400 when no message content provided', async () => {
      const res = await request(app)
        .post('/webhook/message')
        .set('x-webhook-token', 'secret-token')
        .send({ other: 'field' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing message content');
    });
  });

  // ---- POST /webhook/slack ----

  describe('POST /webhook/slack', () => {
    it('should broadcast Slack text to channel', async () => {
      const res = await request(app)
        .post('/webhook/slack')
        .set('x-webhook-token', 'secret-token')
        .send({ text: 'Slack message', username: 'bot' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        '[bot] Slack message'
      );
    });

    it('should extract text from Slack attachments', async () => {
      const res = await request(app)
        .post('/webhook/slack')
        .set('x-webhook-token', 'secret-token')
        .send({
          attachments: [
            { text: 'Attachment 1', fallback: 'Fallback 1' },
            { text: 'Attachment 2' },
          ],
        });

      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Attachment 1')
      );
    });

    it('should return 400 when no text or attachments provided', async () => {
      const res = await request(app)
        .post('/webhook/slack')
        .set('x-webhook-token', 'secret-token')
        .send({ username: 'bot' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing Slack message content');
    });
  });

  // ---- Concurrency ----

  describe('concurrent requests', () => {
    it('should handle 50 concurrent webhook requests', async () => {
      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/webhook')
          .set('x-webhook-token', 'secret-token')
          .send({ id: `pred-${i}`, status: 'succeeded', output: [`out-${i}`] })
      );

      const results = await Promise.all(requests);

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(50);
    });
  });
});
