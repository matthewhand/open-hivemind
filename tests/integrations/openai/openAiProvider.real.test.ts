import { OpenAiProvider } from '@src/integrations/openai/openAiProvider';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

jest.unmock('openai');

describe.skip('OpenAI Real Integration', () => {
  let provider: OpenAiProvider;

  beforeAll(() => {
    if (!OPENAI_API_KEY) {
      console.log('Skipping real OpenAI tests - OPENAI_API_KEY not found');
    }
  });

  beforeEach(() => {
    if (OPENAI_API_KEY) {
      provider = new OpenAiProvider();
    }
  });

  it('should generate real completion', async () => {
    if (!OPENAI_API_KEY) return;

    const response = await provider.generateChatCompletion(
      'Say "Hello World" in exactly 2 words',
      [],
      { model: 'gpt-3.5-turbo', max_tokens: 10 }
    );
    
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
    expect(response.toLowerCase()).toContain('hello');
  }, 30000);

  it('should handle real rate limiting', async () => {
    if (!OPENAI_API_KEY) return;

    const promises = Array(5).fill(0).map(() => 
      provider.generateChatCompletion('Test', [], { model: 'gpt-3.5-turbo', max_tokens: 5 })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBeGreaterThan(0);
  }, 60000);

  it('should handle conversation history', async () => {
    if (!OPENAI_API_KEY) return;

    const history = [
      { role: 'user', content: 'My name is Alice' },
      { role: 'assistant', content: 'Hello Alice!' }
    ];
    
    const response = await provider.generateChatCompletion(
      'What is my name?',
      history,
      { model: 'gpt-3.5-turbo', max_tokens: 10 }
    );
    
    expect(response.toLowerCase()).toContain('alice');
  }, 30000);
});