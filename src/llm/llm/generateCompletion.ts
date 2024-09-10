import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getLlmProvider } from '@src/message/management/getLlmProvider';

const debug = Debug('app:sendCompletions');

/**
 * Sends a completion request using the configured LLM provider (OpenAI or Flowise).
 * @param {IMessage[]} messages - Array of messages for the completion.
 * @returns {Promise<string>} - The generated response.
 */
export async function sendCompletions(messages: IMessage[]): Promise<string> {
  const prompt = messages.map(msg => msg.getText()).join(' ');
  debug(`Generated prompt: ${prompt}`);

  // Retrieve the LLM provider dynamically
  const llmProvider = getLlmProvider(messages[0].getChannelId());

  try {
    // Delegate the completion generation to the appropriate provider
    const result = await llmProvider.generateCompletion(prompt);
    debug('Generated completion from provider:', result);
    return result;
  } catch (error: any) {
    debug('Error sending completion via provider:', error.message);
    throw new Error(`Failed to send completion: ${error.message}`);
  }
}
