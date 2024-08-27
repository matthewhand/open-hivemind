import Debug from 'debug';
import { IMessage } from '@src/interfaces/IMessage';
import ConfigurationManager from '@src/config/ConfigurationManager';

/**
 * Builds the request body for OpenAI API calls.
 *
 * Prepares a structured request body by processing message history and applying
 * specific configurations for interaction with the OpenAI API.
 *
 * @param historyMessages - Array of IMessage representing the message history.
 * @returns A request body object ready for OpenAI API consumption.
 */
export function buildChatCompletionRequestBody(
  historyMessages: IMessage[] = [],
): Record<string, any> {
  const debug = Debug('app:buildChatCompletionRequestBody');

  let messages: Array<{ role: string; content: string; name?: string }> = [
    { role: 'system', content: ConfigurationManager.LLM_SYSTEM_PROMPT },
  ];

  const supportNameField = process.env.LLM_SUPPORT_NAME_FIELD !== 'false';

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
    messages.push({ role: 'user', content: '' });
  }

  const requestBody: Record<string, any> = {
    model: ConfigurationManager.LLM_MODEL,
    messages: messages,
    max_tokens: ConfigurationManager.LLM_RESPONSE_MAX_TOKENS,
    temperature: ConfigurationManager.LLM_TEMPERATURE,
  };

  const llmStop = ConfigurationManager.LLM_STOP.length > 0 ? ConfigurationManager.LLM_STOP : null;

  if (llmStop) {
    requestBody.stop = llmStop;
  }

  debug('Built request body: ', requestBody);

  return requestBody;
}
