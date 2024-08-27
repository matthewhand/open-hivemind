import OpenAI from 'openai';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { IMessage } from '@src/message/interfaces/IMessage';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

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
        messages: messages.map(message => ({ role: message.getRole(), content: message.getText() })),
        max_tokens: ConfigurationManager.LLM_RESPONSE_MAX_TOKENS,
        temperature: ConfigurationManager.OPENAI_TEMPERATURE,
        stop: ConfigurationManager.LLM_STOP,
        top_p: ConfigurationManager.LLM_TOP_P,
    };

    return client.chat.completions.create(requestBody);
}
