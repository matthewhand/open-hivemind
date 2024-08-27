import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getEmoji } from '@src/utils/getEmoji';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import { ChatCompletionCreateParams } from 'openai/dist/api';

/**
 * Builds the request body for OpenAI API calls.
 *
 * Prepares a structured request body by processing message history and applying
 * specific configurations for interaction with the OpenAI API.
 *
 * @param historyMessages - Array of IMessage representing the message history.
 * @param systemMessageContent - Content for the system prompt.
 * @param maxTokens - Maximum number of tokens to generate.
 * @returns A request body object ready for OpenAI API consumption.
 */

const debug = Debug('app:buildChatCompletionRequestBody');

export function buildChatCompletionRequestBody(
    historyMessages: IMessage[] = [],
    systemMessageContent: string = ConfigurationManager.LLM_SYSTEM_PROMPT,
    maxTokens: number = ConfigurationManager.LLM_RESPONSE_MAX_TOKENS
): ChatCompletionCreateParams {
    // Guard clause for input validation
    if (!Array.isArray(historyMessages)) {
        debug('Invalid input: historyMessages must be an array');
        throw new Error('Invalid input: historyMessages must be an array');
    }

    let messages: Array<{ role: string; content: string; name?: string }> = [
        { role: 'system', content: systemMessageContent },
    ];

    const supportNameField = process.env.LLM_SUPPORT_NAME_FIELD !== 'false';

    if (
        historyMessages.length > 0 &&
        historyMessages[0].isFromBot() &&
        historyMessages[0].role !== 'user'
    ) {
        messages.push({ role: 'user', content: '...' });
    }

    historyMessages.forEach((message) => {
        const currentRole = message.isFromBot() ? 'assistant' : 'user';
        const authorName = message.getAuthorId();

        if (supportNameField) {
            if (
                messages[messages.length - 1].role !== currentRole ||
                messages[messages.length - 1].name !== authorName
            ) {
                messages.push({ role: currentRole, content: message.getText(), name: authorName });
            } else {
                messages[messages.length - 1].content += ' ' + message.getText();
            }
        } else {
            if (messages[messages.length - 1].role !== currentRole) {
                messages.push({ role: currentRole, content: message.getText() });
            } else {
                messages[messages.length - 1].content += ' ' + message.getText();
            }
        }
    });

    if (messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: getEmoji() });
    }

    const requestBody: ChatCompletionCreateParams = {
        model: ConfigurationManager.LLM_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: ConfigurationManager.LLM_TEMPERATURE,
    };

    const llmStop = ConfigurationManager.LLM_STOP.length > 0 ? ConfigurationManager.LLM_STOP : null;

    if (llmStop) {
        requestBody.stop = llmStop;
    }

    debug('Built request body: ', requestBody);

    return requestBody;
}
