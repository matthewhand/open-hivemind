import axios from 'axios';
import Debug from 'debug';
import { generateChatCompletion } from '@hivemind/provider-openwebui/runInference';
import * as sessionManager from '@hivemind/provider-openwebui/sessionManager';
import * as uploadKnowledgeFile from '@hivemind/provider-openwebui/uploadKnowledgeFile';

// Silence debug logs during tests
jest.mock('debug', () => () => jest.fn());

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('runInference.generateChatCompletion', () => {
  const mockGetSessionKey = jest.spyOn(sessionManager, 'getSessionKey');
  const mockGetKnowledgeFileId = jest.spyOn(uploadKnowledgeFile, 'getKnowledgeFileId');

  const makeMsg = (text: string) =>
    ({
      getText: () => text,
    }) as any;

  beforeEach(() => {
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
    mockedAxios.post.mockResolvedValue({ data: 'hello world' });

    const res = await generateChatCompletion('Hi there', [makeMsg('prev1'), makeMsg('prev2')], {
      a: 1,
    });

    expect(mockGetSessionKey).toHaveBeenCalledTimes(1);
    expect(mockGetKnowledgeFileId).toHaveBeenCalledTimes(1);

    // Validate axios call
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, payload, options] = mockedAxios.post.mock.calls[0];

    expect(url).toMatch(/\/api\/\/chat\/completions$/); // default apiUrl ends with /api/
    expect(payload).toEqual({
      prompt: 'Hi there',
      knowledgeFileId: 'kf-abc',
      history: ['prev1', 'prev2'],
      metadata: { a: 1 },
    });
    expect(options).toEqual({
      headers: {
        Authorization: 'Bearer sk-123',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    expect(res).toEqual({ text: 'hello world' });
  });

  it('normalizes object response with text field', async () => {
    mockGetSessionKey.mockResolvedValue('sk-xxx');
    mockGetKnowledgeFileId.mockReturnValue('kf-zzz');
    mockedAxios.post.mockResolvedValue({ data: { text: 'response text' } });

    const res = await generateChatCompletion('Ask', [makeMsg('history')]);
    expect(res).toEqual({ text: 'response text' });
  });

  it('falls back to "No response" when data is object without text', async () => {
    mockGetSessionKey.mockResolvedValue('sk-xxx');
    mockGetKnowledgeFileId.mockReturnValue('kf-zzz');
    mockedAxios.post.mockResolvedValue({ data: { somethingElse: true } });

    const res = await generateChatCompletion('Ask', []);
    expect(res).toEqual({ text: 'No response' });
  });

  it('throws generic error when axios rejects', async () => {
    mockGetSessionKey.mockResolvedValue('sk-err');
    mockGetKnowledgeFileId.mockReturnValue('kf-err');
    mockedAxios.post.mockRejectedValue(new Error('network down'));

    await expect(generateChatCompletion('fail please', [])).rejects.toThrow(
      'Inference failed. Please try again.'
    );
  });
});
