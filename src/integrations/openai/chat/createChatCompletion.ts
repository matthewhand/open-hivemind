import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import llmConfig from '@llm/interfaces/llmConfig'; 
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

const debug = Debug('app:createChatCompletion');

/**
 * Creates a chat completion request payload for OpenAI's API.
 * 
 * This function uses both llmConfig and openaiConfig to handle settings.
 * It constructs the necessary request body using `convertIMessageToChatParam`.
 */
export async function createChatCompletion(messages: IMessage[]): Promise<string> {
    try {
        const model = openaiConfig.get('OPENAI_MODEL');
        const maxTokens = llmConfig.get('LLM_RESPONSE_MAX_TOKENS');
        const temperature = llmConfig.get('LLM_TEMPERATURE');

        debug(`Creating chat completion with model: ${model}`);
        debug(`Number of messages: ${messages.length}`);

        const response = await openai.ChatCompletion.create({
            model,
            messages: messages.map(convertIMessageToChatParam),
            max_tokens: maxTokens,
            temperature,
        });

        if (response && response.choices && response.choices[0].message.content) {
            return response.choices[0].message.content;
        }

        throw new Error('Failed to get a valid response from OpenAI.');
    } catch (error: any) {
        debug('Failed to create chat completion: ' + error.message);
        throw error;
    }
}
