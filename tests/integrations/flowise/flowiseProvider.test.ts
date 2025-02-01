import FlowiseProvider from '../../../src/integrations/flowise/flowiseProvider';
import { IMessage } from '@message/interfaces/IMessage';

describe('FlowiseProvider Unit Tests', () => {
  let flowiseProvider: FlowiseProvider;

  beforeEach(() => {
    flowiseProvider = new FlowiseProvider({
      chatflowConversationId: 'test-chatflow-conversation',
      chatflowCompletionId: 'test-chatflow-completion',
      apiKey: 'test-api-key',
      apiEndpoint: 'http://test.flowise.endpoint',
    });
  });

  test('should initialize FlowiseProvider correctly', () => {
    expect(flowiseProvider).toBeDefined();
  });

  test('should generate a chat completion', async () => {
    const userMessage = 'Hello, Flowise!';
    const historyMessages: IMessage[] = [];

    const response = await flowiseProvider.generateChatCompletion(userMessage, historyMessages);
    expect(response).toBeDefined();
  });

  test('should generate a completion', async () => {
    const response = await flowiseProvider.generateCompletion('Hello');
    expect(response).toBeDefined();
  });

  test('should throw error when chatflowConversationId is missing', () => {
    expect(() => new FlowiseProvider({})).toThrow('Flowise configuration is incomplete.');
  });
});
