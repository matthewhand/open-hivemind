import Debug from 'debug';
import { http } from '@hivemind/shared-types';
import type { IMessage } from '@message/interfaces/IMessage';
import openWebUIConfig from './openWebUIConfig';
import { getSessionKey } from './sessionManager';
import { getKnowledgeFileId } from './uploadKnowledgeFile';

const debug = Debug('app:runInference');

/**
 * Executes inference using Open WebUI with the provided user message, chat history, and metadata.
 *
 * @param userMessage - The input from the user.
 * @param historyMessages - The message history.
 * @param metadata - Optional metadata for additional context.
 * @returns A promise resolving to the inference result with a text property.
 */
export async function generateChatCompletion(
  userMessage: string,
  historyMessages: IMessage[],
  metadata?: Record<string, any>
): Promise<{ text: string }> {
  const { apiUrl } = openWebUIConfig.getProperties();

  if (!userMessage || userMessage.trim() === '') {
    debug('Invalid user message:', userMessage);
    throw new Error('User message cannot be empty.');
  }

  const knowledgeFileId = getKnowledgeFileId();

  debug('Running inference with user message:', userMessage);
  debug('Using knowledge file ID:', knowledgeFileId);
  debug('History Messages:', historyMessages);
  debug('Metadata:', metadata);

  try {
    const sessionKey = await getSessionKey();
    const headers = {
      Authorization: 'Bearer ' + sessionKey,
      'Content-Type': 'application/json',
    };

    const url = apiUrl + '/chat/completions';
    const payload: any = {
      prompt: userMessage,
      knowledgeFileId,
      history: historyMessages.map((msg) => msg.getText()), // Convert to plain text
      metadata: metadata || {}, // Include metadata in payload
    };
    // Optional model override (for task routing).
    if (metadata && (metadata.modelOverride || metadata.model)) {
      payload.model = metadata.modelOverride || metadata.model;
    }
    if (
      metadata &&
      typeof metadata.systemPrompt === 'string' &&
      metadata.systemPrompt.trim() !== ''
    ) {
      payload.systemPrompt = metadata.systemPrompt;
    }

    const response = await http.post<{ text?: string } | string>(url, payload, { headers, timeout: 15000 });

    debug('Inference result:', response);
    const responseText =
      typeof response === 'string' ? response : (response as any).text || 'No response';
    return { text: responseText };
  } catch (error) {
    debug('Inference request failed:', error);
    throw new Error('Inference failed. Please try again.');
  }
}
