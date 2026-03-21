import { create, manifest } from './index';
import { OpenSwarmProvider } from './OpenSwarmProvider';

jest.mock('@hivemind/shared-types', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn().mockReturnValue(false),
}));

const axios = require('axios');

const mockMessage = (text = 'hello') => ({
  getText: () => text,
  getAuthorId: () => 'user-1',
  getChannelId: () => 'chan-1',
  metadata: {},
});

describe('OpenSwarmProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create() returns an OpenSwarmProvider', () => {
    expect(create()).toBeInstanceOf(OpenSwarmProvider);
  });

  it('manifest type is llm', () => {
    expect(manifest.type).toBe('llm');
  });

  it('generateChatCompletion returns string response', async () => {
    axios.post.mockResolvedValueOnce({
      data: { choices: [{ message: { content: 'swarm reply' } }] },
    });
    const p = new OpenSwarmProvider();
    const result = await p.generateChatCompletion('hello', [], {});
    expect(typeof result).toBe('string');
    expect(result).toContain('swarm reply');
  });

  it('generateCompletion delegates to generateChatCompletion', async () => {
    axios.post.mockResolvedValueOnce({
      data: { choices: [{ message: { content: 'ok' } }] },
    });
    const p = new OpenSwarmProvider();
    const result = await p.generateCompletion('ping');
    expect(result).toBe('ok');
  });
});
