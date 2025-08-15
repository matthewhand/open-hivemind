import express, { Request, Response } from 'express';
import { runRoute } from '../helpers/expressRunner';
import { configureEventWebhookRoutes } from '../../src/webhook/routes/eventWebhookRoutes';

// Mock security middlewares to be pass-through
jest.mock('../../src/webhook/security/webhookSecurity', () => ({
  __esModule: true,
  verifyWebhookToken: jest.fn((req: Request, res: Response, next: Function) => next()),
  verifyIpWhitelist: jest.fn((req: Request, res: Response, next: Function) => next()),
}));

describe('/webhooks/events', () => {
  let app: express.Application;
  const messageService = { sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined) } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    configureEventWebhookRoutes(app, messageService);
  });

  it('posts a message with message.post and data.text', async () => {
    const body = {
      version: 1,
      id: 'evt-1',
      type: 'message.post',
      timestamp: new Date().toISOString(),
      data: { text: 'hello world' },
    };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body });
    expect(res.statusCode).toBe(200);
    expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith('', 'hello world');
  });

  it('uses channelId from data when provided', async () => {
    const body = {
      id: 'evt-2', type: 'message.post', data: { text: 'hi', channelId: 'chan-123' }
    };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body });
    expect(res.statusCode).toBe(200);
    expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith('chan-123', 'hi');
  });

  it('uses channelId from query when provided (overrides empty)', async () => {
    const body = { id: 'evt-3', type: 'message.post', data: { text: 'ping' } };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body, query: { channelId: 'q-chan' } });
    expect(res.statusCode).toBe(200);
    expect(messageService.sendPublicAnnouncement).toHaveBeenCalledWith('q-chan', 'ping');
  });

  it('returns 400 for invalid envelope (missing fields)', async () => {
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body: { type: 'message.post' } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid event envelope');
  });

  it('returns 400 when data.text is missing for message.post', async () => {
    const body = { id: 'evt-4', type: 'message.post', data: {} };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid event payload');
  });

  it('returns 400 for unsupported type', async () => {
    const body = { id: 'evt-5', type: 'unknown.type', data: {} };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Unsupported event type');
  });

  it('responds to health.ping with ok and challenge when provided', async () => {
    const body = { id: 'evt-6', type: 'health.ping', data: { challenge: 'abc' } };
    const { res } = await runRoute(app, 'post', '/webhooks/events', { body });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, challenge: 'abc' });
  });
});

