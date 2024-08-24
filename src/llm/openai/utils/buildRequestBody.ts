import { IMessage } from '@src/message/types/IMessage';
import { getEmoji } from '@src/utils/getEmoji';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

/**
 * Builds the request body for OpenAI API calls.
 * 
 * @param historyMessages - Array of IMessage representing the message history.
 * @param systemMessageContent - Content for the system prompt.
 * @param maxTokens - Maximum number of tokens to generate.
 * @returns A request body object ready for OpenAI API consumption.
 */
export function buildRequestBody(
    historyMessages: IMessage[] = [],
    systemMessageContent: string = ConfigurationManager.LLM_SYSTEM_PROMPT,
    maxTokens: number = ConfigurationManager.LLM_RESPONSE_MAX_TOKENS
): Record<string, any> {
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

    const requestBody: Record<string, any> = {
        model: ConfigurationManager.LLM_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: ConfigurationManager.LLM_TEMPERATURE,
    };

    const llmStop = ConfigurationManager.LLM_STOP.length > 0 ? ConfigurationManager.LLM_STOP : null;

    if (llmStop) {
        requestBody.stop = llmStop;
    }

    return requestBody;
}
