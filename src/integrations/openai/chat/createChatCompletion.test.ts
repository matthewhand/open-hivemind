import { OpenAiService } from '@integrations/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock data
const mockMessages: IMessage[] = [
  { role: 'user', content: 'Hello', client: {}, channelId: '', data: {}, getMessageId: () => '' },
  { role: 'assistant', content: 'Hi there!', client: {}, channelId: '', data: {}, getMessageId: () => '' }
];

const mockSystemMessage = 'This is a test system message';

// Test createChatCompletion
 test('createChatCompletion should generate a valid completion', async () => {
   const response = await OpenAiService.getInstance().createChatCompletion(mockMessages, mockSystemMessage);
   expect(response).toBeTruthy();
});
