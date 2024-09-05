import openai from 'openai';
import llmConfig from '@llm/interfaces/llmConfig';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

const debug = Debug('app:createChatCompletion');

/**
 * Creates a chat completion request payload for OpenAI's API.
 * 
 * This function maps the application's `IMessage` interface to the format expected by OpenAI's SDK.
 * It constructs the necessary request body using `convertIMessageToChatParam`.
 * Debugging statements and guards are added to validate the inputs and track the execution flow.
 * 
 * Key Features:
 * - **Type Mapping**: Converts `IMessage` objects to OpenAI's `ChatCompletionMessageParam` using a separate utility.
 * - **Validation and Guards**: Ensures that the input data is complete and correctly formatted.
 * - **Debugging**: Logs key values and the execution flow for easier debugging.
 */
export async function createChatCompletion(messages: IMessage[]): Promise<string> {
    try {
        const model = llmConfig.get('model');
        const maxTokens = llmConfig.get('maxTokens');
        const temperature = llmConfig.get('temperature');

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
