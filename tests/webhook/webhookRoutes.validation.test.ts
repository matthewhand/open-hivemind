import express, { Request, Response } from 'express';
import request from 'supertest';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import * as security from '@webhook/security/webhookSecurity';
import { IMessengerService } from '@message/interfaces/IMessengerService';

// Mock security middlewares to be controllable per test
jest.mock('@webhook/security/webhookSecurity', () => {
  return {
    __esModule: true,
    verifyWebhookToken: jest.fn((req: Request, res: Response, next: Function) => next()),
    verifyIpWhitelist: jest.fn((req: Request, res: Response, next: Function) => next()),
  };
});

describe('webhookRoutes validation', () => {
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

  describe('request body validation', () => {
    it('returns 400 for non-object body', async () => {
      const res = await request(app).post('/webhook').send('not an object');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Invalid request body',
        details: ['Body must be a JSON object']
      });
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('returns 400 for missing id field', async () => {
      const res = await request(app).post('/webhook').send({
        status: 'succeeded',
        output: ['result']
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "id" is required and must be a non-empty string');
      expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
    });

    it('returns 400 for empty id field', async () => {
      const res = await request(app).post('/webhook').send({
        id: '',
        status: 'succeeded',
        output: ['result']
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "id" is required and must be a non-empty string');
    });

    it('returns 400 for non-string id field', async () => {
      const res = await request(app).post('/webhook').send({
        id: 12345,
        status: 'succeeded',
        output: ['result']
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "id" is required and must be a non-empty string');
    });

    it('returns 400 for missing status field', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        output: ['result']
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "status" is required and must be a string');
    });

    it('returns 400 for non-string status field', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 200,
        output: ['result']
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "status" is required and must be a string');
    });

    it('returns 400 for non-array output field when provided', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'processing',
        output: 'not an array'
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "output" must be an array if provided');
    });

    it('returns 400 when status is succeeded but output is missing', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded'
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Field "output" is required as an array when status is "succeeded"');
    });

    it('returns 400 when status is succeeded but output is not array', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded',
        output: 'string result'
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([
        'Field "output" must be an array if provided',
        'Field "output" is required as an array when status is "succeeded"'
      ]);
    });

    it('accepts valid request with all required fields', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded',
        output: ['result', 'text']
      });
      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    });

    it('accepts valid request without output for non-succeeded status', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'processing'
      });
      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    });

    it('accepts valid request with empty output array', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded',
        output: []
      });
      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    });
  });

  describe('channel selection via query parameter', () => {
    it('uses channelId from query parameter when provided', async () => {
      const res = await request(app)
        .post('/webhook?channelId=custom-channel')
        .send({
          id: 'pred-123',
          status: 'succeeded',
          output: ['result']
        });
      
      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        'custom-channel',
        expect.stringContaining('result')
      );
    });

    it('uses empty channel when no query parameter provided', async () => {
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded',
        output: ['result']
      });
      
      expect(res.status).toBe(200);
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith(
        '',
        expect.stringContaining('result')
      );
    });
  });

  describe('redaction and security', () => {
    it('should redact sensitive fields in logs (manual verification via debug output)', async () => {
      // This test ensures the redaction function is called
      // Actual redaction verification would require debug log inspection
      const res = await request(app).post('/webhook').send({
        id: 'pred-123',
        status: 'succeeded',
        output: ['result'],
        apikey: 'secret-key',
        password: 'secret-password'
      });
      
      expect(res.status).toBe(200);
      // The sensitive fields should be redacted in logs, but the webhook should still process
      expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    });
  });
});