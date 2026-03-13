import { create, manifest } from './index';
import { openWebUIProvider } from './openWebUIProvider';

jest.mock('@hivemind/shared-types', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => {
  const mockPost = jest.fn();
  const mockGet = jest.fn();
  const instance = { post: mockPost, get: mockGet };
  return {
    create: jest.fn(() => instance),
    isAxiosError: jest.fn().mockReturnValue(false),
    _instance: instance,
  };
});

const axios = require('axios');

describe('openWebUIProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create() returns the singleton provider', () => {
    expect(create()).toBe(openWebUIProvider);
  });

  it('manifest type is llm', () => {
    expect(manifest.type).toBe('llm');
  });

  it('generateChatCompletion returns content string', async () => {
    axios._instance.post.mockResolvedValueOnce({
      data: { choices: [{ message: { content: 'webui reply' } }] },
    });
    const result = await openWebUIProvider.generateChatCompletion('hello', []);
    expect(result).toBe('webui reply');
  });

  it('generateChatCompletion throws on error', async () => {
    axios._instance.post.mockRejectedValueOnce(new Error('network'));
    await expect(openWebUIProvider.generateChatCompletion('hello', [])).rejects.toThrow(
      'Chat completion failed'
    );
  });
});
