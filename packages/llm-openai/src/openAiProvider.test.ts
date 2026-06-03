import { create, manifest } from './index';
import { OpenAiProvider } from './openAiProvider';

jest.mock('openai', () => {
  const mockCreate = jest.fn((params: { stream?: boolean }) => {
    if (params?.stream) {
      // Return an async iterable of streaming chunks.
      const chunks = [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ', ' } }] },
        { choices: [{ delta: { content: 'world' } }] },
        { choices: [{ delta: {} }] }, // no content delta -> skipped
      ];
      return Promise.resolve({
        async *[Symbol.asyncIterator]() {
          for (const c of chunks) {
            yield c;
          }
        },
      });
    }
    return Promise.resolve({ choices: [{ message: { content: 'openai reply' } }] });
  });
  const mockCompletionsCreate = jest.fn().mockResolvedValue({
    choices: [{ text: 'completion reply' }],
  });
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
    completions: { create: mockCompletionsCreate },
  }));
  return { __esModule: true, default: MockOpenAI, OpenAI: MockOpenAI };
});

describe('OpenAiProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create() returns an OpenAiProvider', () => {
    expect(create({ apiKey: 'sk-test' })).toBeInstanceOf(OpenAiProvider);
  });

  it('manifest type is llm', () => {
    expect(manifest.type).toBe('llm');
  });

  it('generateChatCompletion returns content', async () => {
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    const result = await p.generateChatCompletion('hello', []);
    expect(result).toBe('openai reply');
  });

  it('generateChatCompletion returns empty string on no content', async () => {
    const { OpenAI } = require('openai');
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }),
        },
      },
    }));
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    const result = await p.generateChatCompletion('hello', []);
    expect(result).toBe('');
  });

  it('generateStreamingChatCompletion streams chunks and returns the full response', async () => {
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    const received: string[] = [];
    const result = await p.generateStreamingChatCompletion('hi', [], (chunk) => {
      received.push(chunk);
    });
    expect(received).toEqual(['Hello', ', ', 'world']);
    expect(result).toBe('Hello, world');
  });

  it('generateStreamingChatCompletion requests a stream from the SDK', async () => {
    const { OpenAI } = require('openai');
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    await p.generateStreamingChatCompletion('hi', [], () => undefined);
    const instance = OpenAI.mock.results[OpenAI.mock.results.length - 1].value;
    expect(instance.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );
  });

  it('supportsChatCompletion returns true', () => {
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    expect(p.supportsChatCompletion()).toBe(true);
  });
});
