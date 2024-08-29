import { createChatCompletion } from './createChatCompletion';
import { MockMessage } from './MockMessage';

test('should process messages with getMessageId method', () => {
    const mockMessage = new MockMessage();
    const messages = [mockMessage];
    const systemMessageContent = "System prompt for testing";
    const maxTokens = 100;
    const result = createChatCompletion(messages, systemMessageContent, maxTokens);
    expect(result).toBeDefined();
});
