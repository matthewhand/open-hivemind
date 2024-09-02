import llmConfig from '@src/llm/interfaces/llmConfig';
import { IMessage } from '@message/interfaces/IMessage';
import { OpenAI } from 'openai';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

/**
 * Creates a chat completion using the OpenAI API based on the provided message history and prompt.
 * 
 * @param historyMessages - Array of IMessage objects representing the conversation history.
 * @param prompt - The prompt to send to the model.
 * @param openai - The OpenAI client instance.
 * @returns The chat completion response from OpenAI.
 */
export const createChatCompletion = async (
    historyMessages: IMessage[], 
    prompt: string, 
    openai: OpenAI
) => {
    // Guard clauses to ensure valid input
    if (!historyMessages || !Array.isArray(historyMessages)) {
        throw new Error('Invalid historyMessages array provided.');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt provided.');
    }

    // Retrieve system message and max tokens from config
    const systemMessageContent: string = llmConfig.get('LLM_SYSTEM_PROMPT') || '';
    const maxTokens: number = llmConfig.get('LLM_RESPONSE_MAX_TOKENS') || 150;

    // Debugging: Log the retrieved config values
    console.debug('System Message Content:', systemMessageContent);
    console.debug('Max Tokens:', maxTokens);

    // Construct the request body for the OpenAI API
    const requestBody = {
        model: llmConfig.get('LLM_MODEL'),
        messages: [
            { role: 'system', content: systemMessageContent },
            ...historyMessages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.getText(),
                name: msg.getAuthorName() || 'unknown', // Ensures name is included
            })),
            { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: llmConfig.get('LLM_TEMPERATURE') || 0.7,
        frequency_penalty: llmConfig.get('LLM_FREQUENCY_PENALTY') || 0,
        presence_penalty: llmConfig.get('LLM_PRESENCE_PENALTY') || 0,
        stop: llmConfig.get('LLM_STOP') || undefined,
        top_p: llmConfig.get('LLM_TOP_P') || 1,
        stream: false as const, // Explicitly setting stream property with correct type
    };

    // Debugging: Log the request body before sending it to OpenAI
    console.debug('Request Body:', JSON.stringify(requestBody, null, 2));

    // Send the request to OpenAI and return the response
    return openai.chat.completions.create({ ...requestBody });
};
