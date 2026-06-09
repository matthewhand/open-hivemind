import express from 'express';
import request from 'supertest';
import { WebhookService } from '@hivemind/message-webhook';
import type { IMessengerService } from '@hivemind/shared-types';
import webhookEventsRouter from '@src/server/routes/webhookEvents';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';

/**
 * Tests that inbound webhook ingress is wired to the messenger service's
 * handleIncomingWebhook method.
 *
 * Regression guard: previously WebhookService.handleIncomingWebhook (in
 * @hivemind/message-webhook) built an IMessage and invoked the registered
 * handler, but nothing in src/webhook/routes called it, so the inbound
 * webhook path was dead. configureWebhookRoutes now mounts POST
 * /webhook/receive (and forwards /webhook/slack) to that method.
 *
 * Security middleware is mocked to pass-through here; token/IP enforcement
 * is covered by webhookSecurity's own behavior. This suite focuses on the
 * wiring between the route and the messenger service.
 */

// Pass-through the security middleware so we exercise the routing logic.
jest.mock('@webhook/security/webhookSecurity', () => ({
  verifyWebhookToken: (_req: unknown, _res: unknown, next: () => void) => next(),
  verifyIpWhitelist: (_req: unknown, _res: unknown, next: () => void) => next(),
  verifySlackSignature: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Unique event ids so retry tests can distinguish original from retry events
// (the global uuid mock returns a constant).
jest.mock('uuid', () => {
  let n = 0;
  return { v4: () => `test-uuid-${++n}` };
});

function buildApp(messageService: IMessengerService, targetChannel?: string) {
  const app = express();
  app.use(express.json());
  configureWebhookRoutes(app, messageService, targetChannel);
  // Mount the WebUI event log routes so we can assert ingress recording and
  // exercise the retry endpoint against real recorded events.
  app.use('/api/webhooks', webhookEventsRouter);
  return app;
}

describe('inbound webhook route wiring', () => {
  it('POST /webhook/receive delivers the payload to the registered handler', async () => {
    const service = new WebhookService();
    const handler = jest.fn().mockResolvedValue('handled-reply');
    service.setMessageHandler(handler);

    const app = buildApp(service);

    const res = await request(app)
      .post('/webhook/receive')
      .send({ text: 'hello from outside', username: 'Alice', channel: 'C123' })
      .expect(200);

    expect(res.body).toEqual({ success: true, reply: 'handled-reply' });
    expect(handler).toHaveBeenCalledTimes(1);

    const [message] = handler.mock.calls[0];
    expect(message.getText()).toBe('hello from outside');
    expect(message.getAuthorName()).toBe('Alice');
    expect(message.getChannelId()).toBe('C123');
  });

  it('POST /webhook/receive prefers the configured target channel', async () => {
    const service = new WebhookService();
    const handler = jest.fn().mockResolvedValue('ok');
    service.setMessageHandler(handler);

    const app = buildApp(service, 'target-channel');

    await request(app).post('/webhook/receive').send({ text: 'hi' }).expect(200);

    const [message] = handler.mock.calls[0];
    expect(message.getChannelId()).toBe('target-channel');
  });

  it('POST /webhook/slack forwards Slack-formatted payloads to the handler', async () => {
    const service = new WebhookService();
    const handler = jest.fn().mockResolvedValue('slack-ok');
    service.setMessageHandler(handler);

    const app = buildApp(service);

    const res = await request(app)
      .post('/webhook/slack')
      .send({ text: 'base', attachments: [{ text: 'extra detail' }] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const [message] = handler.mock.calls[0];
    expect(message.getText()).toContain('base');
    expect(message.getText()).toContain('extra detail');
  });

  it('returns 501 when the messenger service does not support inbound webhooks', async () => {
    const bareService = {
      getDefaultChannel: () => 'default',
      setMessageHandler: () => undefined,
    } as unknown as IMessengerService;

    const app = buildApp(bareService);

    await request(app).post('/webhook/receive').send({ text: 'hi' }).expect(501);
  });

  it('returns 500 when handleIncomingWebhook rejects', async () => {
    const failingService = {
      getDefaultChannel: () => 'default',
      setMessageHandler: () => undefined,
      handleIncomingWebhook: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as IMessengerService;

    const app = buildApp(failingService);

    await request(app).post('/webhook/receive').send({ text: 'hi' }).expect(500);
  });
});

describe('webhook ingress event recording', () => {
  it('records a success event in the webhook event log for /webhook/receive', async () => {
    const service = new WebhookService();
    service.setMessageHandler(jest.fn().mockResolvedValue('ok'));

    const app = buildApp(service);

    await request(app)
      .post('/webhook/receive')
      .set('user-agent', 'jest-agent')
      .send({ text: 'record me', channel: 'C9' })
      .expect(200);

    const list = await request(app).get('/api/webhooks/events').expect(200);
    const event = list.body.data.items.find(
      (e: { endpoint: string; payloadPreview: string }) =>
        e.endpoint === '/webhook/receive' && e.payloadPreview.includes('record me')
    );
    expect(event).toBeDefined();
    expect(event.source).toBe('generic');
    expect(event.method).toBe('POST');
    expect(event.statusCode).toBe(200);
    expect(event.headers['user-agent']).toBe('jest-agent');
  });

  it('records a failure event when processing rejects', async () => {
    const failingService = {
      getDefaultChannel: () => 'default',
      setMessageHandler: () => undefined,
      handleIncomingWebhook: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as IMessengerService;

    const app = buildApp(failingService);

    await request(app).post('/webhook/receive').send({ text: 'will fail' }).expect(500);

    const list = await request(app).get('/api/webhooks/events?status=failed').expect(200);
    const event = list.body.data.items.find((e: { payloadPreview: string }) =>
      e.payloadPreview.includes('will fail')
    );
    expect(event).toBeDefined();
    expect(event.statusCode).toBe(500);
    expect(event.error).toBe('boom');
  });

  it('records Slack ingress under the slack source', async () => {
    const service = new WebhookService();
    service.setMessageHandler(jest.fn().mockResolvedValue('slack-ok'));

    const app = buildApp(service);

    await request(app).post('/webhook/slack').send({ text: 'slack ping' }).expect(200);

    const list = await request(app).get('/api/webhooks/events?source=slack').expect(200);
    const event = list.body.data.items.find((e: { payloadPreview: string }) =>
      e.payloadPreview.includes('slack ping')
    );
    expect(event).toBeDefined();
    expect(event.endpoint).toBe('/webhook/slack');
  });

  it('retrying a recorded failure re-dispatches through the real handler path', async () => {
    const handleIncomingWebhook = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient outage'))
      .mockResolvedValueOnce('recovered');
    const service = {
      getDefaultChannel: () => 'default',
      setMessageHandler: () => undefined,
      handleIncomingWebhook,
    } as unknown as IMessengerService;

    const app = buildApp(service, 'target-channel');

    // First delivery fails and is recorded.
    await request(app).post('/webhook/receive').send({ text: 'flaky' }).expect(500);

    const list = await request(app).get('/api/webhooks/events?status=failed').expect(200);
    const failed = list.body.data.items.find((e: { payloadPreview: string }) =>
      e.payloadPreview.includes('flaky')
    );
    expect(failed).toBeDefined();

    // Retry re-dispatches the original payload through handleIncomingWebhook.
    const retry = await request(app)
      .post(`/api/webhooks/events/${failed.id}/retry`)
      .send({})
      .expect(200);

    expect(retry.body.success).toBe(true);
    expect(retry.body.data.statusCode).toBe(200);
    expect(handleIncomingWebhook).toHaveBeenCalledTimes(2);
    expect(handleIncomingWebhook).toHaveBeenLastCalledWith({ text: 'flaky' }, 'target-channel');

    // The successful retry is recorded as a new event.
    const detail = await request(app)
      .get(`/api/webhooks/events/${retry.body.data.retryId}`)
      .expect(200);
    expect(detail.body.data.statusCode).toBe(200);
    expect(detail.body.data.headers['x-retry-of']).toBe(failed.id);
  });
});
