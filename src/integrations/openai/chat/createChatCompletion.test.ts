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
    getUserMentions: () => [],
    getChannelUsers: () => [],
    isReplyToBot: () => false,
    mentionsUsers: () => false,
    isFromBot: () => false,
    reply: () => null,
    getAuthorName: () => '',
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
    getUserMentions: () => [],
    getChannelUsers: () => [],
    isReplyToBot: () => false,
    mentionsUsers: () => false,
    isFromBot: () => false,
    reply: () => null,
    getAuthorName: () => '',
  }
];

const mockSystemMessage = 'This is a test system message';

// Test for createChatCompletion
// Fix: Ensure Promise resolves correctly
// Improvement: Added more detailed assertions, comments, and debug logging
 test('createChatCompletion should generate a valid completion', async () => {
   console.debug('[DEBUG] Starting test for createChatCompletion');
   const response = await OpenAiService.getInstance().createChatCompletion(mockMessages, mockSystemMessage);
   expect(response).toBeTruthy();
   expect(typeof response).toBe('string'); // Ensuring the response is a string
   expect(response.length).toBeGreaterThan(0); // Response should not be empty
   console.debug('[DEBUG] Test completed successfully with response:', response);
   return Promise.resolve(); // Ensure Promise resolves correctly
});
