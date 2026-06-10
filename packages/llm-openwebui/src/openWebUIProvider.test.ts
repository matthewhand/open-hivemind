import type { IMessage } from '@hivemind/shared-types';
import { create, manifest } from './index';
import { mapHistoryRole, openWebUIProvider } from './openWebUIProvider';

// Mock DNS so isSafeUrl always resolves to a public IP in tests
jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

jest.mock('convict', () => {
  const schema: any = {};
  return jest.fn(() => ({
    schema,
    get: jest.fn((key: string) => {
      if (key === 'apiUrl') return 'https://openwebui.example.com';
      if (key === 'model') return 'test-model';
      if (key === 'embeddingModel') return 'test-embed-model';
      return '';
    }),
    set: jest.fn(),
    validate: jest.fn(),
    getProperties: jest.fn(() => ({
      apiUrl: 'https://openwebui.example.com',
      model: 'test-model',
      username: 'u',
      password: 'p',
      authMethod: 'apiKey',
      apiKey: 'fake-key',
    })),
  }));
});

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
});

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  );
}

function makeMsg(text: string, role: string, fromBot = false): IMessage {
  return {
    role,
    content: text,
    getText: () => text,
    isFromBot: () => fromBot,
  } as unknown as IMessage;
}

function lastFetchCall() {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [url, init] = calls[calls.length - 1];
  return { url: url as string, init: init as RequestInit, body: JSON.parse(init.body as string) };
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('openWebUIProvider', () => {
  it('manifest type is llm', () => {
    expect(manifest.type).toBe('llm');
  });

  it('supportsChatCompletion returns true', () => {
    expect(openWebUIProvider.supportsChatCompletion()).toBe(true);
  });

  it('supportsCompletion returns true', () => {
    expect(openWebUIProvider.supportsCompletion()).toBe(true);
  });

  it('generateChatCompletion returns content string', async () => {
    mockFetch({ choices: [{ message: { content: 'webui reply' } }] });
    expect(await openWebUIProvider.generateChatCompletion('hello', [])).toBe('webui reply');
  });

  it('generateChatCompletion returns empty string when no content', async () => {
    mockFetch({ choices: [{ message: { content: '' } }] });
    expect(await openWebUIProvider.generateChatCompletion('hello', [])).toBe('');
  });

  it('generateChatCompletion throws on HTTP error', async () => {
    mockFetch({ error: 'fail' }, 500);
    await expect(openWebUIProvider.generateChatCompletion('hello', [])).rejects.toThrow(
      'Chat completion failed'
    );
  });

  it('generateCompletion returns text string', async () => {
    mockFetch({ choices: [{ text: 'completion reply' }] });
    expect(await openWebUIProvider.generateCompletion('prompt')).toBe('completion reply');
  });

  it('generateCompletion throws on HTTP error', async () => {
    mockFetch({ error: 'fail' }, 500);
    await expect(openWebUIProvider.generateCompletion('prompt')).rejects.toThrow(
      'Non-chat completion failed'
    );
  });

  it('generateEmbedding returns the embedding vector', async () => {
    const vector = [0.1, 0.2, 0.3];
    mockFetch({ data: [{ embedding: vector }] });
    expect(await openWebUIProvider.generateEmbedding!('embed me')).toEqual(vector);
  });

  it('generateEmbedding throws when the response has no embedding', async () => {
    mockFetch({ data: [{}] });
    await expect(openWebUIProvider.generateEmbedding!('embed me')).rejects.toThrow(
      'Embedding generation failed'
    );
  });

  it('generateEmbedding throws on HTTP error', async () => {
    mockFetch({ error: 'fail' }, 500);
    await expect(openWebUIProvider.generateEmbedding!('embed me')).rejects.toThrow(
      'Embedding generation failed'
    );
  });
});

describe('history role mapping', () => {
  it('mapHistoryRole preserves assistant and system roles', () => {
    expect(mapHistoryRole(makeMsg('hi', 'assistant'))).toBe('assistant');
    expect(mapHistoryRole(makeMsg('rules', 'system'))).toBe('system');
  });

  it('mapHistoryRole maps bot-authored messages to assistant even when role is user', () => {
    expect(mapHistoryRole(makeMsg('bot said this', 'user', true))).toBe('assistant');
  });

  it('mapHistoryRole defaults human and unknown roles to user', () => {
    expect(mapHistoryRole(makeMsg('hello', 'user'))).toBe('user');
    expect(mapHistoryRole(makeMsg('tool output', 'tool'))).toBe('user');
    expect(mapHistoryRole(makeMsg('weird', ''))).toBe('user');
  });

  it('mapHistoryRole falls back to user when isFromBot throws', () => {
    const msg = {
      role: 'user',
      getText: () => 'x',
      isFromBot: () => {
        throw new Error('boom');
      },
    } as unknown as IMessage;
    expect(mapHistoryRole(msg)).toBe('user');
  });

  it('generateChatCompletion sends mixed history with correct roles', async () => {
    mockFetch({ choices: [{ message: { content: 'ok' } }] });
    const history = [
      makeMsg('you are helpful', 'system'),
      makeMsg('hello bot', 'user'),
      makeMsg('hello human', 'assistant'),
      makeMsg('platform bot turn', 'user', true),
    ];
    await openWebUIProvider.generateChatCompletion('latest question', history);

    const { body } = lastFetchCall();
    expect(body.messages).toEqual([
      { role: 'system', content: 'you are helpful' },
      { role: 'user', content: 'hello bot' },
      { role: 'assistant', content: 'hello human' },
      { role: 'assistant', content: 'platform bot turn' },
      { role: 'user', content: 'latest question' },
    ]);
  });
});

describe('per-bot config via create()', () => {
  it('uses per-bot apiUrl, apiKey and model when provided', async () => {
    mockFetch({ choices: [{ message: { content: 'bot reply' } }] });
    const provider = create({
      apiUrl: 'https://bot.example.com/api',
      apiKey: 'bot-key',
      model: 'bot-model',
    });

    expect(await provider.generateChatCompletion('hi', [])).toBe('bot reply');

    const { url, init, body } = lastFetchCall();
    expect(url).toBe('https://bot.example.com/api/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer bot-key');
    expect(body.model).toBe('bot-model');
  });

  it('accepts raw schema key names (OPEN_WEBUI_*)', async () => {
    mockFetch({ choices: [{ message: { content: 'raw reply' } }] });
    const provider = create({
      OPEN_WEBUI_API_URL: 'https://raw.example.com/api',
      OPEN_WEBUI_API_KEY: 'raw-key',
      OPEN_WEBUI_MODEL: 'raw-model',
    });

    expect(await provider.generateChatCompletion('hi', [])).toBe('raw reply');

    const { url, init, body } = lastFetchCall();
    expect(url).toBe('https://raw.example.com/api/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer raw-key');
    expect(body.model).toBe('raw-model');
  });

  it('authHeader wins over apiKey', async () => {
    mockFetch({ choices: [{ message: { content: 'ok' } }] });
    const provider = create({
      apiUrl: 'https://bot.example.com/api',
      authHeader: 'Bearer custom-token',
      apiKey: 'ignored-key',
    });

    await provider.generateChatCompletion('hi', []);

    const { init } = lastFetchCall();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer custom-token');
  });

  it('falls back to global config when no per-bot overrides are given', async () => {
    mockFetch({ choices: [{ message: { content: 'global reply' } }] });
    const provider = create({});

    expect(await provider.generateChatCompletion('hi', [])).toBe('global reply');

    const { url, body } = lastFetchCall();
    expect(url).toBe('https://openwebui.example.com/chat/completions');
    expect(body.model).toBe('test-model');
  });

  it('uses per-bot model for non-chat completions', async () => {
    mockFetch({ choices: [{ text: 'completion' }] });
    const provider = create({
      apiUrl: 'https://bot.example.com/api',
      apiKey: 'bot-key',
      model: 'bot-model',
    });

    expect(await provider.generateCompletion('prompt')).toBe('completion');

    const { url, body } = lastFetchCall();
    expect(url).toBe('https://bot.example.com/api/completions');
    expect(body.model).toBe('bot-model');
  });

  it('returns a fresh provider instance per call', () => {
    expect(create({ model: 'a' })).not.toBe(create({ model: 'a' }));
  });
});
