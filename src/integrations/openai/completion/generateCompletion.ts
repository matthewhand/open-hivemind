import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getLlmProvider } from '@src/message/management/getLlmProvider';

const debug = Debug('app:sendCompletions');

/**
 * Sends a completion request using the configured LLM provider (e.g., OpenAI or Flowise).
 * @param {IMessage[]} messages - Array of messages forming the input context.
 * @returns {Promise<string>} - The generated response.
 */
export async function sendCompletions(messages: IMessage[]): Promise<string> {
  // Construct a prompt by joining message texts
  const prompt = messages.map(msg => msg.getText()).join(' ');
  debug(`Generated prompt: ${prompt}`);

  // Retrieve the LLM provider (no arguments needed)
  const llmProvider = getLlmProvider();

  try {
    // Delegate the task to the provider's generateChatCompletion method
    const result = await llmProvider.generateChatCompletion(prompt, messages);
    debug('Generated completion from provider:', result);
    return result;
  } catch (error: any) {
    debug('Error sending completion via provider:', error.message);
    throw new Error(`Failed to send completion: ${error.message}`);
  }
}
