import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAI } from 'openai';
import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llm');
const debug = Debug('app:OpenAiService');

if (!llmConfig) {
    throw new Error('LLM configuration not found. Please ensure the LLM config is loaded.');
}

/**
 * Creates a chat completion request payload for OpenAI's API.
 *
 * @param openai - The OpenAI API client instance.
 * @param historyMessages - The chat history as an array of IMessage objects.
 * @param systemMessageContent - The content for the system message.
 * @param maxTokens - The maximum number of tokens for the completion.
 * @returns A payload to send to OpenAI's create chat completion API.
 */
export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string = llmConfig?.get('LLM_SYSTEM_PROMPT') || '',
    maxTokens: number = parseInt(llmConfig?.get<string>('LLM_RESPONSE_MAX_TOKENS') || '150')
): Promise<OpenAI.Chat.ChatCompletion> {
    try {
        const requestBody = {
            model: openai.model,
            messages: [
                { role: 'system', content: systemMessageContent },
                ...historyMessages.map(msg => ({
                    role: msg.role,
                    content: msg.getText(),
                    name: msg.getAuthorName() || 'unknown',
                })),
            ],
            max_tokens: maxTokens,
            temperature: llmConfig?.get('LLM_TEMPERATURE') || 0.7,
            frequency_penalty: llmConfig?.get('LLM_FREQUENCY_PENALTY') || 0,
            presence_penalty: llmConfig?.get('LLM_PRESENCE_PENALTY') || 0,
            stop: llmConfig?.get('LLM_STOP') || undefined,
            top_p: llmConfig?.get('LLM_TOP_P') || 1,
            stream: false,
        };

        debug('createChatCompletion: Sending request to OpenAI API');
        const response = await openai.chat.completions.create(requestBody);
        return response as unknown as OpenAI.Chat.ChatCompletion;
    } catch (error: any) {
        debug('createChatCompletion: Error occurred:', error);
        throw new Error(`Failed to create chat completion: ${error.message}`);
    }
}
