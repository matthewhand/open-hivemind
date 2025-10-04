import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import axios from 'axios';
import openaiConfig from '@config/openaiConfig';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:OpenAiService');

/**
 * Fetch the first available OpenAI model.
 * @returns {string} - Model's ID (default is 'gpt-3.5-turbo').
 */
function getOpenAIModel(): string {
  return openaiConfig.get('OPENAI_MODEL') || 'gpt-3.5-turbo';
}

/**
 * Generate a chat response using OpenAI without SDK dependency.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
 * @returns {Promise<string | null>} - Chat response or null.
 */
export async function generateChatCompletion(
  message: string,
  historyMessages: IMessage[],
  options: {
    parallelExecution: boolean;
    maxRetries: number;
    finishReasonRetry: string;
    isBusy: () => boolean;
    setBusy: (status: boolean) => void;
  }
): Promise<string | null> {
  try {
    debug('message:', message);
    debug('historyMessages:', historyMessages);
    debug('options:', options);

    if (!message) {
      throw new Error('No input message provided.');
    }
    if (!historyMessages || historyMessages.length === 0) {
      throw new Error('No history messages provided.');
    }

    const model = getOpenAIModel();
    const systemMessageContent = 'Initializing system context...';

    if (options.isBusy()) {
      debug('Service is busy.');
      return null;
    }
    options.setBusy(true);

    // Prepare the message payload with system, user, and history messages
    const chatParams = [
      { role: 'system', content: systemMessageContent },
      { role: 'user', content: message },
      ...historyMessages.map((msg) => ({ role: msg.role, content: msg.content, name: msg.getAuthorId() || 'unknown' }))
    ];

    // API request details
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: chatParams,
        temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
        max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 150,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiConfig.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
      }
    );
    options.setBusy(false);

    return response.data.choices[0]?.message.content || null;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);
    
    debug('Error:', ErrorUtils.getMessage(hivemindError));
    
    // Log with appropriate level based on classification
    switch (classification.logLevel) {
      case 'error':
        console.error('OpenAI chat completion error:', hivemindError);
        break;
      case 'warn':
        console.warn('OpenAI chat completion warning:', hivemindError);
        break;
      default:
        debug('OpenAI chat completion info:', hivemindError);
    }
    
    options.setBusy(false);
    throw ErrorUtils.createError(
      `OpenAI chat completion failed: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'OPENAI_COMPLETION_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error }
    );
  }
}
