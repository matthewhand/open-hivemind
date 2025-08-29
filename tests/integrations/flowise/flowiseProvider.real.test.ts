import { FlowiseProvider } from '@src/integrations/flowise/flowiseProvider';

const REAL_FLOWISE_URL = process.env.REAL_FLOWISE_URL || process.env.FLOWISE_API_ENDPOINT;
const REAL_FLOWISE_API_KEY = process.env.REAL_FLOWISE_API_KEY || process.env.FLOWISE_API_KEY;
const REAL_FLOWISE_CHATFLOW_ID = process.env.REAL_FLOWISE_CHATFLOW_ID || process.env.FLOWISE_CONVERSATION_CHATFLOW_ID;

jest.unmock('axios');

describe.skip('Flowise Real Integration', () => {
  let provider: FlowiseProvider;

  beforeAll(() => {
    if (!REAL_FLOWISE_URL || !REAL_FLOWISE_CHATFLOW_ID) {
      console.log('Skipping real Flowise tests - set REAL_FLOWISE_URL and REAL_FLOWISE_CHATFLOW_ID');
    }
  });

  beforeEach(() => {
    if (REAL_FLOWISE_URL && REAL_FLOWISE_CHATFLOW_ID) {
      process.env.FLOWISE_BASE_URL = REAL_FLOWISE_URL;
      process.env.FLOWISE_API_KEY = REAL_FLOWISE_API_KEY || '';
      provider = new FlowiseProvider();
    }
  });

  it('should generate real completion', async () => {
    if (!REAL_FLOWISE_URL || !REAL_FLOWISE_CHATFLOW_ID) return;

    const response = await provider.generateChatCompletion(
      'Hello, how are you?',
      [],
      { 
        chatflowId: REAL_FLOWISE_CHATFLOW_ID,
        channelId: 'test-channel',
        userId: 'test-user'
      }
    );
    
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle conversation with history', async () => {
    if (!REAL_FLOWISE_URL || !REAL_FLOWISE_CHATFLOW_ID) return;

    const history = [
      { role: 'user', content: 'My favorite color is blue' },
      { role: 'assistant', content: 'That\'s a nice color!' }
    ];
    
    const response = await provider.generateChatCompletion(
      'What is my favorite color?',
      history,
      { 
        chatflowId: REAL_FLOWISE_CHATFLOW_ID,
        channelId: 'test-channel',
        userId: 'test-user'
      }
    );
    
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle API errors gracefully', async () => {
    if (!REAL_FLOWISE_URL) return;

    const response = await provider.generateChatCompletion(
      'Test message',
      [],
      { 
        chatflowId: 'invalid-chatflow-id',
        channelId: 'test-channel',
        userId: 'test-user'
      }
    );
    
    expect(typeof response).toBe('string');
  }, 30000);
});