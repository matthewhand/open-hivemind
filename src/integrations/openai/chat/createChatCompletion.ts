import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llm');

if (!llmConfig) {
    throw new Error('LLM configuration not found. Please ensure the LLM config is loaded.');
}

/**
 * Creates a chat completion request payload for OpenAI's API.
 *
 * @param historyMessages - The chat history as an array of IMessage objects.
 * @param systemMessageContent - The content for the system message.
 * @param maxTokens - The maximum number of tokens for the completion.
 * @returns A payload to send to OpenAI's create chat completion API.
 */
export function createChatCompletion(
    historyMessages: IMessage[],
    systemMessageContent: string = llmConfig?.get('LLM_SYSTEM_PROMPT') || '',
    maxTokens: number = llmConfig?.get('LLM_RESPONSE_MAX_TOKENS') || 150
): OpenAI.Chat.CreateChatCompletionRequestMessage {
    // @ts-ignore: Suppressing deep type instantiation issues
    const chatCompletionRequest = {
        messages: [
            { role: 'system', content: systemMessageContent },
            ...historyMessages.map(msg => ({ role: msg.role, content: msg.content })),
        ],
        max_tokens: maxTokens,
        temperature: llmConfig?.get('LLM_TEMPERATURE') || 0.7,
        frequency_penalty: llmConfig?.get('LLM_FREQUENCY_PENALTY') || 0,
        presence_penalty: llmConfig?.get('LLM_PRESENCE_PENALTY') || 0,
        stop: llmConfig?.get('LLM_STOP') || undefined,
        top_p: llmConfig?.get('LLM_TOP_P') || 1,
    } as unknown as OpenAI.Chat.CreateChatCompletionRequestMessage;

    return chatCompletionRequest;
}
