import Debug from 'debug';
// import type { OpenAiService } from '@src/integrations/openai/OpenAiService';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:completeSentence');

/**
 * Completes a sentence using the OpenAI API.
 * 
 * @param client - The OpenAiService instance.
 * @param content - The content to complete.
 * @returns The completed sentence.
 */
export async function completeSentence(
  client: any,
  content: string,
): Promise<string> {
  try {
    // Using generateChatCompletion to get the completion
    const response = await client.generateChatCompletion(content, []);

    // Ensure response is valid and trim any extra whitespace
    const trimmedResponse = response?.text?.trim();
    if (trimmedResponse) {
      return trimmedResponse;
    } else {
      debug('Empty or invalid response received.');
      return ''; // Return an empty string if no valid response
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error completing sentence:', ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('OpenAI sentence completion error:', hivemindError);
    }

    return ''; // Return an empty string in case of failure
  }
}
