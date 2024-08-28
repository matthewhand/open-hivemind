import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:completeSentence');
const configManager = new ConfigurationManager();

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
        const response = await client.createChatCompletion(JSON.stringify({
            model: configManager.OPENAI_MODEL,
            messages: [{ role: 'user', content }],
            max_tokens: configManager.OPENAI_MAX_TOKENS,
            temperature: configManager.OPENAI_TEMPERATURE,
            top_p: configManager.LLM_TOP_P,
            frequency_penalty: configManager.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: configManager.OPENAI_PRESENCE_PENALTY,
            stop: configManager.LLM_STOP
        }));
        return response.choices[0].message.content.trim();
    } catch (error: any) {
        debug('Error completing sentence:', error);
        return ''; // Return an empty string in case of failure
    }
}
