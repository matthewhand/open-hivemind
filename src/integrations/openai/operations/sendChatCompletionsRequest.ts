import OpenAI from 'openai';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { IMessage } from '@src/message/interfaces/IMessage';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

/**
 * Determines the role for a message based on its origin.
 * @param message - The IMessage object.
 * @returns 'user' if the message is from a user, 'assistant' if from the bot.
 */
function determineRole(message: IMessage): 'user' | 'assistant' {
    return message.isFromBot() ? 'assistant' : 'user';
}

/**
 * Sends a chat completion request to the OpenAI API.
 * @param messages - Array of messages to send as context for the completion.
 * @returns The response from the OpenAI API.
 */
export async function sendChatCompletionsRequest(messages: IMessage[]): Promise<any> {
    const client = new OpenAI({
        apiKey: ConfigurationManager.OPENAI_API_KEY,
        baseURL: ConfigurationManager.OPENAI_BASE_URL,
        timeout: ConfigurationManager.OPENAI_TIMEOUT,
        organization: ConfigurationManager.OPENAI_ORGANIZATION,
    });

    const requestBody: ChatCompletionCreateParamsNonStreaming = {
        model: ConfigurationManager.OPENAI_MODEL,
        messages: messages.map(message => ({ role: determineRole(message), content: message.getText() })),
        max_tokens: ConfigurationManager.LLM_RESPONSE_MAX_TOKENS,
        temperature: ConfigurationManager.OPENAI_TEMPERATURE,
        stop: ConfigurationManager.LLM_STOP,
        top_p: ConfigurationManager.LLM_TOP_P,
    };

    return client.chat.completions.create(requestBody);
}

/**
 * Additional utility function to manage request payloads.
 * @param messages - Array of IMessage objects.
 * @param maxTokens - Maximum tokens to generate in the completion.
 * @returns A structured request body for OpenAI API.
 */
export function buildChatRequestBody(messages: IMessage[], maxTokens: number = 100): ChatCompletionCreateParamsNonStreaming {
    const requestBody: ChatCompletionCreateParamsNonStreaming = {
        model: ConfigurationManager.OPENAI_MODEL,
        messages: messages.map(message => ({ role: determineRole(message), content: message.getText() })),
        max_tokens: maxTokens,
        temperature: ConfigurationManager.OPENAI_TEMPERATURE,
        stop: ConfigurationManager.LLM_STOP,
        top_p: ConfigurationManager.LLM_TOP_P,
    };
    return requestBody;
}

/**
 * Processes the chat completion response and logs relevant details.
 * @param response - The response object returned from the OpenAI API.
 * @returns Extracted text content from the response.
 */
export function processChatResponse(response: any): string {
    if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid response from OpenAI API. No choices returned.');
    }

    const choice = response.choices[0];
    return choice.text.trim();
}
