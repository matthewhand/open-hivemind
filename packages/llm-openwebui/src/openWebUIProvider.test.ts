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
      return '';
    }),
    set: jest.fn(),
    validate: jest.fn(),
    getProperties: jest.fn(() => ({ apiUrl: 'https://openwebui.example.com', model: 'test-model', username: 'u', password: 'p' })),
  }));
});

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
});

import { create, manifest } from './index';
import { openWebUIProvider } from './openWebUIProvider';

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
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
    await expect(openWebUIProvider.generateChatCompletion('hello', [])).rejects.toThrow('Chat completion failed');
  });

  it('generateCompletion returns text string', async () => {
    mockFetch({ choices: [{ text: 'completion reply' }] });
    expect(await openWebUIProvider.generateCompletion('prompt')).toBe('completion reply');
  });

  it('generateCompletion throws on HTTP error', async () => {
    mockFetch({ error: 'fail' }, 500);
    await expect(openWebUIProvider.generateCompletion('prompt')).rejects.toThrow('Non-chat completion failed');
  });
});
