import type { IMessage } from '@hivemind/shared-types';
import { TelegramMessage, type TelegramUpdate } from './TelegramMessage';
import { TelegramPoller, type FetchLike } from './TelegramPoller';
import { TelegramService } from './TelegramService';

/**
 * Tests for the Telegram receive path:
 *  1. TelegramPoller long-polls getUpdates with correct offset tracking,
 *     survives handler/API errors, and stops promptly on shutdown.
 *  2. TelegramService wires incoming updates through the registered message
 *     handler as TelegramMessage instances, skipping the bot's own messages.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([
        {
          name: 'tg-bot',
          messageProvider: 'telegram',
          llmProvider: 'openai',
          telegram: { botToken: '999:test-token', chatId: '-500123' },
        },
        {
          name: 'discord-bot',
          messageProvider: 'discord',
          discord: { token: 'x' },
        },
      ]),
    }),
  },
}));

jest.mock('@src/server/services/WebSocketService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ recordMessageFlow: jest.fn() }),
  },
}));

const okJson = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const buildUpdate = (updateId: number, over: Partial<Record<string, unknown>> = {}) => ({
  update_id: updateId,
  message: {
    message_id: updateId * 10,
    from: { id: 1001, is_bot: false, first_name: 'Ada', username: 'ada' },
    chat: { id: -500123, type: 'group', title: 'Engine Room' },
    date: 1750000000,
    text: `msg-${updateId}`,
    ...over,
  },
});

describe('TelegramPoller', () => {
  it('omits the offset on the first poll, then advances it past the highest update_id', async () => {
    const bodies: any[] = [];
    const fetchFn: FetchLike = jest
      .fn()
      .mockImplementation(async (_url: string, init?: { body?: string }) => {
        bodies.push(JSON.parse(init?.body ?? '{}'));
        return okJson({ ok: true, result: [buildUpdate(7), buildUpdate(9)] });
      });

    const seen: number[] = [];
    const poller = new TelegramPoller({
      token: 'tok',
      fetchFn,
      onUpdate: (u: TelegramUpdate) => {
        seen.push(u.update_id);
      },
    });

    expect(poller.getOffset()).toBeUndefined();
    await poller.pollOnce();
    expect(seen).toEqual([7, 9]);
    expect(poller.getOffset()).toBe(10);
    expect(bodies[0].offset).toBeUndefined();

    await poller.pollOnce();
    expect(bodies[1].offset).toBe(10);
  });

  it('targets the bot-token getUpdates endpoint with allowed_updates and timeout', async () => {
    const fetchFn: FetchLike = jest.fn().mockResolvedValue(okJson({ ok: true, result: [] }) as any);
    const poller = new TelegramPoller({
      token: '999:secret',
      fetchFn,
      pollTimeoutSeconds: 25,
      onUpdate: jest.fn(),
    });
    await poller.pollOnce();

    const [url, init] = (fetchFn as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot999:secret/getUpdates');
    const body = JSON.parse(init.body);
    expect(body.timeout).toBe(25);
    expect(body.allowed_updates).toEqual(['message']);
  });

  it('still advances the offset when the update handler throws (no poison-message loop)', async () => {
    const fetchFn: FetchLike = jest
      .fn()
      .mockResolvedValue(okJson({ ok: true, result: [buildUpdate(3), buildUpdate(4)] }) as any);
    const onUpdate = jest
      .fn()
      .mockRejectedValueOnce(new Error('handler exploded'))
      .mockResolvedValue(undefined);

    const poller = new TelegramPoller({ token: 'tok', fetchFn, onUpdate });
    await expect(poller.pollOnce()).resolves.toBe(2);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(poller.getOffset()).toBe(5);
  });

  it('throws on HTTP errors and ok:false API responses', async () => {
    const httpError: FetchLike = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) } as any);
    const poller1 = new TelegramPoller({ token: 'tok', fetchFn: httpError, onUpdate: jest.fn() });
    await expect(poller1.pollOnce()).rejects.toThrow('HTTP 502');

    const apiError: FetchLike = jest
      .fn()
      .mockResolvedValue(okJson({ ok: false, description: 'Unauthorized' }) as any);
    const poller2 = new TelegramPoller({ token: 'tok', fetchFn: apiError, onUpdate: jest.fn() });
    await expect(poller2.pollOnce()).rejects.toThrow('Unauthorized');
  });

  it('long-poll loop: polls repeatedly, backs off on errors, and stop() aborts in-flight requests', async () => {
    let calls = 0;
    let abortedInFlight = false;

    const fetchFn: FetchLike = jest
      .fn()
      .mockImplementation((_url: string, init?: { signal?: AbortSignal }) => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve(okJson({ ok: true, result: [buildUpdate(1)] }));
        }
        if (calls === 2) {
          return Promise.reject(new Error('transient network error'));
        }
        // Third call simulates a hanging long poll; resolve only on abort.
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            abortedInFlight = true;
            reject(new Error('aborted'));
          });
        });
      });

    const seen: number[] = [];
    const poller = new TelegramPoller({
      token: 'tok',
      fetchFn,
      errorBackoffMs: 5,
      onUpdate: (u: TelegramUpdate) => {
        seen.push(u.update_id);
      },
    });

    poller.start();
    expect(poller.isRunning()).toBe(true);

    // Wait until the loop has consumed the good batch, the error, and is hanging.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(seen).toEqual([1]);
    expect(calls).toBe(3);
    expect(poller.getOffset()).toBe(2);

    await poller.stop();
    expect(poller.isRunning()).toBe(false);
    expect(abortedInFlight).toBe(true);

    // No further polls after stop.
    const callsAfterStop = calls;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(callsAfterStop);
  });
});

describe('TelegramService receive wiring', () => {
  const getMeResponse = okJson({
    ok: true,
    result: { id: 999, is_bot: true, first_name: 'HiveBot', username: 'hivebot' },
  });

  const buildServiceFetch = (updates: unknown[]) => {
    let updatesServed = false;
    return jest.fn().mockImplementation((url: string, init?: { signal?: AbortSignal }) => {
      if (url.endsWith('/getMe')) {
        return Promise.resolve(getMeResponse);
      }
      if (url.endsWith('/getUpdates')) {
        if (!updatesServed) {
          updatesServed = true;
          return Promise.resolve(okJson({ ok: true, result: updates }));
        }
        // Hang subsequent long polls until shutdown aborts them.
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }
      return Promise.resolve(okJson({ ok: true, result: {} }));
    }) as unknown as FetchLike;
  };

  it('dispatches incoming updates to the registered handler as TelegramMessage, skipping self-messages', async () => {
    const selfMessage = buildUpdate(11, {
      from: { id: 999, is_bot: true, first_name: 'HiveBot', username: 'hivebot' },
    });
    const fetchFn = buildServiceFetch([buildUpdate(10), selfMessage]);
    const service = TelegramService.createForTesting({ fetchFn });

    const received: Array<{ message: IMessage; botConfig: any }> = [];
    let resolveReceived: () => void;
    const receivedOnce = new Promise<void>((resolve) => {
      resolveReceived = resolve;
    });

    service.setMessageHandler(async (message, history, botConfig) => {
      received.push({ message, botConfig });
      expect(history).toEqual([]);
      resolveReceived();
      return null;
    });
    await service.initialize();
    await receivedOnce;
    await service.shutdown();

    expect(received).toHaveLength(1);
    const { message, botConfig } = received[0];
    expect(message).toBeInstanceOf(TelegramMessage);
    expect(message.getText()).toBe('msg-10');
    expect(message.getChannelId()).toBe('-500123');
    expect(message.platform).toBe('telegram');
    // Bot identity resolved via getMe is used for mention mapping.
    expect(message.mentionsUsers('999')).toBe(false);
    expect(botConfig.BOT_NAME).toBe('tg-bot');
    expect(botConfig.llmProvider).toBe('openai');
  });

  it('only configures bots with messageProvider=telegram and exposes identity/channel accessors', async () => {
    const fetchFn = buildServiceFetch([]);
    const service = TelegramService.createForTesting({ fetchFn });

    expect(service.getBotNames()).toEqual(['tg-bot']);
    expect(service.getDefaultChannel()).toBe('-500123');
    // Bot id is derived from the token prefix before getMe resolves.
    expect(service.getClientId()).toBe('999');
    expect(service.isConnected()).toBe(false);

    service.setMessageHandler(async () => null);
    await service.initialize();
    expect(service.isConnected()).toBe(true);
    expect(service.isConnected('tg-bot')).toBe(true);

    await service.shutdown();
    expect(service.isConnected()).toBe(false);
  });

  it('does not start polling until a message handler is registered', async () => {
    const fetchFn = buildServiceFetch([buildUpdate(1)]);
    const service = TelegramService.createForTesting({ fetchFn });

    await service.initialize();
    // getMe is called during initialize, but no getUpdates poll without a handler.
    const polled = (fetchFn as jest.Mock).mock.calls.some(([url]) =>
      String(url).endsWith('/getUpdates')
    );
    expect(polled).toBe(false);
    expect(service.isConnected()).toBe(false);

    service.setMessageHandler(async () => null);
    expect(service.isConnected()).toBe(true);
    await service.shutdown();
  });
});
