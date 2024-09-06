import { OpenAiService } from '@integrations/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock data with all required properties for IMessage
const mockMessages: IMessage[] = [
  {
    role: 'user',
    content: 'Hello',
    client: {},
    channelId: '',
    data: {},
    getMessageId: () => '',
    getText: () => 'Hello',
    getChannelId: () => '',
    getAuthorId: () => '',
    getChannelTopic: () => '',
    getTimestamp: () => new Date(),
  },
  {
    role: 'assistant',
    content: 'Hi there!',
    client: {},
    channelId: '',
    data: {},
    getMessageId: () => '',
    getText: () => 'Hi there!',
    getChannelId: () => '',
    getAuthorId: () => '',
    getChannelTopic: () => '',
    getTimestamp: () => new Date(),
  }
];

const mockSystemMessage = 'This is a test system message';

// Test for createChatCompletion
// Improvement: Added more detailed assertions and comments
 test('createChatCompletion should generate a valid completion', async () => {
   const response = await OpenAiService.getInstance().createChatCompletion(mockMessages, mockSystemMessage);
   expect(response).toBeTruthy();
   expect(typeof response).toBe('string'); // Ensuring the response is a string
   expect(response.length).toBeGreaterThan(0); // Response should not be empty
});
