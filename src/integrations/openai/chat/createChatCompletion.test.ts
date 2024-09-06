import { OpenAiService } from '@integrations/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock data
const mockMessages: IMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
];

const mockSystemMessage = 'This is a test system message';

// Initialize OpenAI service
const openAiService = OpenAiService.getInstance();

// Test createChatCompletion
test('createChatCompletion should generate a valid completion', async () => {
    const response = await openAiService.createChatCompletion(mockMessages, mockSystemMessage);
    expect(response).toBeTruthy();
});
