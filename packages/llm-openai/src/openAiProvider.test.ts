import { create, manifest } from './index';
import { OpenAiProvider } from './openAiProvider';

jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'openai reply' } }],
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

  it('supportsChatCompletion returns true', () => {
    const p = new OpenAiProvider({ apiKey: 'sk-test' });
    expect(p.supportsChatCompletion()).toBe(true);
  });
});
