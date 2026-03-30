import express from 'express';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import { runRoute } from '../helpers/expressRunner';

// Do NOT mock security middlewares here to test the real integration with Express
// We mock webhookConfig instead to control the expected token/IP
jest.mock('@config/webhookConfig', () => ({
  get: jest.fn(),
}));

const mockWebhookConfig = require('@config/webhookConfig');

describe.skip('webhookRoutes (Integration)', () => {
  let app: express.Application;
  let messageService: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    messageService = {
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    } as any;

    configureWebhookRoutes(app, messageService);
  });

  describe('Negative Security Integration', () => {
    it('blocks request when WEBHOOK_TOKEN is required but missing', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '';
        return '';
      });

      const body = { id: 'pred-1', status: 'succeeded', output: [] };
      const { res } = await runRoute(app, 'post', '/webhook', { body, headers: {} });

      expect(res.statusCode).toBe(403);
      expect(res.text).toBe('Forbidden: Invalid token');
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('blocks request when WEBHOOK_TOKEN is invalid', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '';
        return '';
      });

      const body = { id: 'pred-1', status: 'succeeded', output: [] };
      const { res } = await runRoute(app, 'post', '/webhook', {
        body,
        headers: { 'x-webhook-token': 'wrong-token' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.text).toBe('Forbidden: Invalid token');
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('blocks request when IP is not in whitelist', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '10.0.0.1,10.0.0.2';
        return '';
      });

      const body = { id: 'pred-1', status: 'succeeded', output: [] };
      const { res } = await runRoute(app, 'post', '/webhook', {
        body,
        headers: { 'x-webhook-token': 'secret-token' },
        ip: '192.168.1.1',
      });

      expect(res.statusCode).toBe(403);
      expect(res.text).toBe('Forbidden: Unauthorized IP address');
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('allows request when token and IP are both valid', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '192.168.1.1';
        return '';
      });

      const body = { id: 'pred-1', status: 'succeeded', output: [] };
      const { res } = await runRoute(app, 'post', '/webhook', {
        body,
        headers: { 'x-webhook-token': 'secret-token' },
        ip: '192.168.1.1',
      });

      expect(res.statusCode).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalled();
    });
  });

  describe('Concurrency & Robustness Coverage', () => {
    it('handles concurrent webhook requests properly', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      const numRequests = 50;
      const requests = Array.from({ length: numRequests }).map((_, i) => {
        const body = { id: `pred-${i}`, status: 'succeeded', output: [`out-${i}`] };
        return runRoute(app, 'post', '/webhook', {
          body,
          headers: { 'x-webhook-token': 'secret-token' },
        });
      });

      const results = await Promise.all(requests);

      // Verify all succeeded
      for (const { res } of results) {
        expect(res.statusCode).toBe(200);
      }

      // Verify the service was called the expected number of times
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(numRequests);
    });

    it('safely rejects excessively large arrays in payload to prevent memory exhaustion', async () => {
      // Return empty token/IP whitelist to bypass security middleware checks
      mockWebhookConfig.get.mockImplementation(() => '');

      const largeArray = Array.from({ length: 1000 }).map(() => 'item');
      const body = { id: 'pred-large', status: 'succeeded', output: largeArray };

      // By supplying an empty token to the route runner, it triggers the missing WEBHOOK_TOKEN 500
      // since we cleared the config. So we must mock it to return 'no-token' instead, so that
      // we bypass the "missing config" error in security middleware when the token is missing/empty.
      // Wait, if WEBHOOK_TOKEN is required in the environment but not set, verifyWebhookToken returns 500.
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      const { res } = await runRoute(app, 'post', '/webhook', {
        body,
        headers: { 'x-webhook-token': 'secret-token' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid request body');
      expect(res.body.details).toContain('"output" array cannot contain more than 10 items');
    });

    it('gracefully handles malformed JSON parsing errors (simulated via string body)', async () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'secret-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      // In real express app, body-parser would throw before reaching route,
      // but if an invalid object gets through, validation should catch it.
      const { res } = await runRoute(app, 'post', '/webhook', {
        body: 'not-an-object',
        headers: { 'x-webhook-token': 'secret-token' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.details).toContain('Request body must be a valid JSON object');
    });
  });
});
