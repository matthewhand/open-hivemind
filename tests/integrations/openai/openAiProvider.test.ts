import { openAiProvider } from '@integrations/openai/openAiProvider';
import { IMessage } from '@message/interfaces/IMessage';

const isOpenAIConfigured = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY';

(isOpenAIConfigured ? describe : describe.skip)('openAiProvider', () => {
  jest.setTimeout(20000);

  it('supportsChatCompletion returns true', () => {
    expect(openAiProvider.supportsChatCompletion()).toBe(true);
  });

  it('supportsCompletion returns true', () => {
    expect(openAiProvider.supportsCompletion()).toBe(true);
  });

  it.skip('generateCompletion returns a string', async () => {
    // Skipped due to API key issues in test environment
    const response = await openAiProvider.generateCompletion('test');
    expect(typeof response).toBe('string');
  });

  it.skip('generateChatCompletion returns a string', async () => {
    // Skipped due to API key issues in test environment
    const history: IMessage[] = [];
    const response = await openAiProvider.generateChatCompletion('test', history);
    expect(typeof response).toBe('string');
  });
});
