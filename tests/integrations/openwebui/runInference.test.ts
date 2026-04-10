import Debug from 'debug';
import { resetAllCircuitBreakers } from '../../../src/common/CircuitBreaker';
import { generateChatCompletion } from '@integrations/openwebui/runInference';
import * as sessionManager from '@integrations/openwebui/sessionManager';
import * as uploadKnowledgeFile from '@integrations/openwebui/uploadKnowledgeFile';
import { http } from '@hivemind/shared-types';

// Silence debug logs during tests
jest.mock('debug', () => () => jest.fn());

jest.mock('@hivemind/shared-types', () => ({
  http: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
}));

const mockHttp = http as jest.Mocked<typeof http>;

describe('runInference.generateChatCompletion', () => {
  const mockGetSessionKey = jest.spyOn(sessionManager, 'getSessionKey');
  const mockGetKnowledgeFileId = jest.spyOn(uploadKnowledgeFile, 'getKnowledgeFileId');

  const makeMsg = (text: string) =>
    ({
      getText: () => text,
    }) as any;

  beforeEach(() => {
    resetAllCircuitBreakers();
    jest.clearAllMocks();
  });

  it('throws when userMessage is empty or blank', async () => {
    await expect(generateChatCompletion('', [])).rejects.toThrow('User message cannot be empty.');
    await expect(generateChatCompletion('   ', [])).rejects.toThrow(
      'User message cannot be empty.'
    );
  });

  it('sends POST to /chat/completions with expected headers and payload; handles string response', async () => {
    mockGetSessionKey.mockResolvedValue('sk-123');
    mockGetKnowledgeFileId.mockReturnValue('kf-abc');
    mockHttp.post.mockResolvedValue('hello world');

    const res = await generateChatCompletion('Hi there', [makeMsg('prev1'), makeMsg('prev2')], {
      a: 1,
    });

    expect(mockGetSessionKey).toHaveBeenCalledTimes(1);
    expect(mockGetKnowledgeFileId).toHaveBeenCalledTimes(1);
    expect(mockHttp.post).toHaveBeenCalledTimes(1);

    const [url, payload, options] = (mockHttp.post as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/chat\/completions$/);
    expect(payload).toEqual({
      prompt: 'Hi there',
      knowledgeFileId: 'kf-abc',
      history: ['prev1', 'prev2'],
      metadata: { a: 1 },
    });
    expect(options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-123',
          'Content-Type': 'application/json',
        }),
      })
    );

    expect(res).toEqual({ text: 'hello world' });
  });

  it('normalizes object response with text field', async () => {
    mockGetSessionKey.mockResolvedValue('sk-xxx');
    mockGetKnowledgeFileId.mockReturnValue('kf-zzz');
    mockHttp.post.mockResolvedValue({ text: 'response text' });

    const res = await generateChatCompletion('Ask', [makeMsg('history')]);
    expect(res).toEqual({ text: 'response text' });
  });

  it('falls back to "No response" when data is object without text', async () => {
    mockGetSessionKey.mockResolvedValue('sk-xxx');
    mockGetKnowledgeFileId.mockReturnValue('kf-zzz');
    mockHttp.post.mockResolvedValue({ somethingElse: true });

    const res = await generateChatCompletion('Ask', []);
    expect(res).toEqual({ text: 'No response' });
  });

  it('throws generic error when http rejects', async () => {
    mockGetSessionKey.mockResolvedValue('sk-err');
    mockGetKnowledgeFileId.mockReturnValue('kf-err');
    mockHttp.post.mockRejectedValue(new Error('network down'));

    await expect(generateChatCompletion('fail please', [])).rejects.toThrow(
      'Inference failed. Please try again.'
    );
  });
});
