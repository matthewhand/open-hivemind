import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * OpenAI provider to generate responses based on full message history.
 *
 * @param {string} userMessage - The latest user message.
 * @param {IMessage[]} historyMessages - The history of previous messages.
 * @returns {Promise<string>} The generated response from OpenAI.
 */
export async function getOpenAiProvider(userMessage: string, historyMessages: IMessage[]): Promise<string> {
  // Logic to send userMessage + historyMessages to OpenAI and return the response
  const messages = historyMessages.map(msg => ({ role: msg.isFromBot() ? 'assistant' : 'user', content: msg.getText() }));
  messages.push({ role: 'user', content: userMessage });

  // Example OpenAI API call placeholder (adjust with actual API call)
  const response = await fakeOpenAiApi(messages); // Replace with actual OpenAI request
  return response.data.choices[0].text;
}

// Placeholder for OpenAI API logic
async function fakeOpenAiApi(messages: any[]): Promise<any> {
  return Promise.resolve({ data: { choices: [{ text: 'OpenAI response based on full history' }] } });
}
