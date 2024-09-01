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
    systemMessageContent: string = '',
    maxTokens: number = llmConfig?.get('LLM_RESPONSE_MAX_TOKENS') || 150
): OpenAI.Chat.CreateChatCompletionRequestMessage {
    // Simplifying retrieval by using a temporary variable
    const systemMessageContentConfig = llmConfig?.get('LLM_SYSTEM_PROMPT') || '';

    // Applying the temporary variable
    systemMessageContent = systemMessageContentConfig;

    const systemMessage = { role: 'system', content: systemMessageContent };
    const mappedHistoryMessages = historyMessages.map(msg => ({ role: msg.role, content: msg.content }));
    const messages = [systemMessage, ...mappedHistoryMessages];

    const max_tokens = maxTokens;

    // @ts-ignore: Suppressing deep type instantiation issues for temperature
    const temperature = llmConfig?.get('LLM_TEMPERATURE') || 0.7;

    // @ts-ignore: Suppressing deep type instantiation issues for frequency_penalty
    const frequency_penalty = llmConfig?.get('LLM_FREQUENCY_PENALTY') || 0;

    // @ts-ignore: Suppressing deep type instantiation issues for presence_penalty
    const presence_penalty = llmConfig?.get('LLM_PRESENCE_PENALTY') || 0;

    const stop = llmConfig?.get('LLM_STOP') || undefined;
    const top_p = llmConfig?.get('LLM_TOP_P') || 1;

    const chatCompletionRequest = {
        messages,
        max_tokens,
        temperature,
        frequency_penalty,
        presence_penalty,
        stop,
        top_p,
    } as unknown as OpenAI.Chat.CreateChatCompletionRequestMessage;

    return chatCompletionRequest;
}
