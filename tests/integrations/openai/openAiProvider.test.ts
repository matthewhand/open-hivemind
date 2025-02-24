import { openAiProvider } from '../../../src/integrations/openai/openAiProvider';
import { OpenAI } from 'openai';

// Mock OpenAI client
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mocked chat completion' } }]
          })
        }
      },
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ text: 'Mocked completion' }]
        })
      }
    }))
  };
});

describe('openAiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('supportsChatCompletion returns true', () => {
    expect(openAiProvider.supportsChatCompletion()).toBe(true);
  });

  test('supportsCompletion returns true', () => {
    expect(openAiProvider.supportsCompletion()).toBe(true);
  });

  test('generateCompletion returns a string', async () => {
    const result = await openAiProvider.generateCompletion('test prompt');
    expect(typeof result).toBe('string');
    expect(result).toBe('Mocked completion');
  });

  test('generateChatCompletion returns a string', async () => {
    const result = await openAiProvider.generateChatCompletion('test message', []);
    expect(typeof result).toBe('string');
    expect(result).toBe('Mocked chat completion');
  });
});
