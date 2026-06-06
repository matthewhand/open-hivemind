import express from 'express';
import request from 'supertest';
import { WebhookService } from '@hivemind/message-webhook';
import type { IMessengerService } from '@hivemind/shared-types';
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

function buildApp(messageService: IMessengerService, targetChannel?: string) {
  const app = express();
  app.use(express.json());
  configureWebhookRoutes(app, messageService, targetChannel);
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
