import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:completeSentence');
const configManager = ConfigurationManager.getInstance();

/**
 * Completes a sentence using the OpenAI API.
 * 
 * @param client - The OpenAiService instance.
 * @param content - The content to complete.
 * @returns The completed sentence.
 */
export async function completeSentence(
    client: OpenAiService,
    content: string
): Promise<string> {
    try {
        // Using generateChatResponse to get the completion
        const response = await client.generateChatResponse(content, []);

        // Ensure response is valid and trim any extra whitespace
        const trimmedResponse = response?.trim();
        if (trimmedResponse) {
            return trimmedResponse;
        } else {
            debug('Empty or invalid response received.');
            return ''; // Return an empty string if no valid response
        }
    } catch (error: any) {
        debug('Error completing sentence:', error);
        return ''; // Return an empty string in case of failure
    }
}
