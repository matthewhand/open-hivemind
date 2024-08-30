import { createChatCompletion } from './createChatCompletion';
import { MockMessage } from './MockMessage';

// Test case: Create Chat Completion with mock messages
const historyMessages = [new MockMessage('data'), new MockMessage('data')];
const systemMessageContent = "System prompt for testing";
const maxTokens = 100;

// Simulate the chat completion creation process
const completionParams = createChatCompletion(historyMessages, systemMessageContent, maxTokens);

// Validate the output
console.log('Completion Params:', completionParams);
