/**
 * Tests for WebhookService outgoing delivery.
 *
 * sendMessageToChannel() used to return a fabricated id without performing
 * any HTTP call. It must now POST the message to the configured outbound URL
 * (per-bot webhook.url → service config outboundUrl/WEBHOOK_URL → WEBHOOK_URL
 * env), with a timeout, surfacing delivery failures as errors and returning
 * the receiver-reported delivery id when available.
 */

import { http, HttpError, type IServiceDependencies } from '@hivemind/shared-types';
import { WebhookService } from './WebhookService';

describe('WebhookService.sendMessageToChannel', () => {
  let postSpy: jest.SpyInstance;
  const prevEnvUrl = process.env.WEBHOOK_URL;
  const prevEnvToken = process.env.WEBHOOK_TOKEN;

  beforeEach(() => {
    postSpy = jest.spyOn(http, 'post').mockResolvedValue({ id: 'srv-123' });
    delete process.env.WEBHOOK_URL;
    delete process.env.WEBHOOK_TOKEN;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (prevEnvUrl === undefined) delete process.env.WEBHOOK_URL;
    else process.env.WEBHOOK_URL = prevEnvUrl;
    if (prevEnvToken === undefined) delete process.env.WEBHOOK_TOKEN;
    else process.env.WEBHOOK_TOKEN = prevEnvToken;
  });

  it('POSTs the message payload to the configured outbound URL with a timeout', async () => {
    const service = new WebhookService(undefined, {
      outboundUrl: 'https://receiver.example.com/hook',
    });

    const id = await service.sendMessageToChannel('chan-1', 'hello world', 'bot-a', 'thread-9');

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, payload, options] = postSpy.mock.calls[0];
    expect(url).toBe('https://receiver.example.com/hook');
    expect(payload).toMatchObject({
      channelId: 'chan-1',
      text: 'hello world',
      sender: 'bot-a',
      threadId: 'thread-9',
    });
    expect(typeof payload.timestamp).toBe('string');
    expect(options.timeout).toBeGreaterThan(0);
    expect(id).toBe('srv-123');
  });

  it('sends a bearer token header when WEBHOOK_TOKEN is configured', async () => {
    const service = new WebhookService(undefined, {
      WEBHOOK_URL: 'https://receiver.example.com/hook',
      WEBHOOK_TOKEN: 'sekret',
    });

    await service.sendMessageToChannel('chan-1', 'hi');

    const [, , options] = postSpy.mock.calls[0];
    expect(options.headers).toEqual({ Authorization: 'Bearer sekret' });
  });

  it('falls back to the WEBHOOK_URL environment variable', async () => {
    process.env.WEBHOOK_URL = 'https://env.example.com/hook';
    const service = new WebhookService();

    await service.sendMessageToChannel('chan-1', 'hi');

    expect(postSpy.mock.calls[0][0]).toBe('https://env.example.com/hook');
  });

  it('prefers the per-bot webhook config resolved via dependencies.getBotConfig', async () => {
    const dependencies = {
      getBotConfig: jest.fn().mockReturnValue({
        name: 'bot-a',
        webhook: { url: 'https://bot.example.com/hook', token: 'bot-token' },
      }),
    } as unknown as IServiceDependencies;
    const service = new WebhookService(dependencies, {
      outboundUrl: 'https://service.example.com/hook',
    });

    await service.sendMessageToChannel('chan-1', 'hi', 'bot-a');

    expect(dependencies.getBotConfig).toHaveBeenCalledWith('bot-a');
    const [url, , options] = postSpy.mock.calls[0];
    expect(url).toBe('https://bot.example.com/hook');
    expect(options.headers).toEqual({ Authorization: 'Bearer bot-token' });
  });

  it('returns a generated delivery id when the receiver reports none', async () => {
    postSpy.mockResolvedValue('OK'); // non-JSON / plain-text response
    const service = new WebhookService(undefined, {
      outboundUrl: 'https://receiver.example.com/hook',
    });

    const id = await service.sendMessageToChannel('chan-1', 'hi');

    expect(id).toMatch(/^webhook-delivered-\d+$/);
  });

  it('throws when no outbound URL is configured (no fake id)', async () => {
    const service = new WebhookService();

    await expect(service.sendMessageToChannel('chan-1', 'hi')).rejects.toThrow(
      /outbound URL is not configured/i
    );
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('surfaces HTTP failures from the receiver', async () => {
    postSpy.mockRejectedValue(new HttpError(500, null, 'HTTP 500 Internal Server Error'));
    const service = new WebhookService(undefined, {
      outboundUrl: 'https://receiver.example.com/hook',
    });

    await expect(service.sendMessageToChannel('chan-1', 'hi')).rejects.toThrow(
      /delivery to https:\/\/receiver\.example\.com\/hook failed: HTTP 500/
    );
  });

  it('surfaces timeouts as descriptive errors', async () => {
    const abortError = new Error('This operation was aborted');
    abortError.name = 'AbortError';
    postSpy.mockRejectedValue(abortError);
    const service = new WebhookService(undefined, {
      outboundUrl: 'https://receiver.example.com/hook',
      timeoutMs: 1234,
    });

    await expect(service.sendMessageToChannel('chan-1', 'hi')).rejects.toThrow(
      /timed out after 1234ms/
    );
  });
});

describe('WebhookService.getMessagesFromChannel', () => {
  it('returns an empty list (webhooks are push-based; no history to poll)', async () => {
    const service = new WebhookService();
    await expect(service.getMessagesFromChannel('chan-1')).resolves.toEqual([]);
  });
});
