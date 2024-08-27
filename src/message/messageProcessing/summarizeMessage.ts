import { OpenAiService } from '@src/llm/openai/OpenAiService';

/**
 * Summarizes a long message using OpenAI's API.
 *
 * @param message - The message text to be summarized.
 * @returns A Promise resolving to the summarized text.
 */
export async function summarizeMessage(message: string): Promise<string> {
  const openAiService = OpenAiService.getInstance();
  const summarizedMessage = await openAiService.createChatCompletion([{ role: 'user', content: message }]);
  return summarizedMessage;
}
