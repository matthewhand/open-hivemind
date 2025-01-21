jest.mock('../../../src/integrations/openai/OpenAiService', () => ({
  OpenAiService: {
    getInstance: () => ({
      generateChatCompletion: jest.fn().mockResolvedValue('Mocked chat completion'),
    }),
  },
}));

import { openAiProvider } from '../../../src/integrations/openai/openAiProvider';

describe('openAiProvider', () => {
  test('supportsChatCompletion returns true', () => {
    expect(openAiProvider.supportsChatCompletion()).toBe(true);
  });

  test('supportsCompletion returns true', () => {
    expect(openAiProvider.supportsCompletion()).toBe(true);
  });

  test('generateCompletion returns a string', async () => {
    const result = await openAiProvider.generateCompletion('test prompt');
    expect(typeof result).toBe('string');
  });

  test('generateChatCompletion returns a string', async () => {
    const result = await openAiProvider.generateChatCompletion('test message', []);
    expect(typeof result).toBe('string');
  });
});