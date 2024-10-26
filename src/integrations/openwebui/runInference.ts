import axios from 'axios';
import { getSessionKey } from './sessionManager';
import { getKnowledgeFileId } from './uploadKnowledgeFile';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';  // Import IMessage

const debug = Debug('app:runInference');

/**
 * Executes inference using Open WebUI with the provided user message and optional chat history.
 * 
 * @param userMessage - The input from the user.
 * @param historyMessages - Optional message history.
 * @returns A promise resolving to the inference result.
 */
export async function generateChatCompletion(
  userMessage: string,
  historyMessages: IMessage[] = []
): Promise<any> {
  const { apiUrl } = openWebUIConfig.getProperties();

  if (!userMessage || userMessage.trim() === '') {
    debug('Invalid user message:', userMessage);
    throw new Error('User message cannot be empty.');
  }

  const knowledgeFileId = getKnowledgeFileId();

  debug('Running inference with user message:', userMessage);
  debug('Using knowledge file ID:', knowledgeFileId);
  debug('History Messages:', historyMessages);

  try {
    const sessionKey = await getSessionKey();
    const headers = {
      Authorization: 'Bearer ' + sessionKey,
      'Content-Type': 'application/json',
    };

    const url = apiUrl + '/chat/completions';
    const payload = {
      prompt: userMessage,
      knowledgeFileId,
      history: historyMessages.map(msg => msg.getText()), // Convert to plain text
    };
    const response = await axios.post(url, payload, { headers });

    debug('Inference result:', response.data);
    return response.data;
  } catch (error) {
    debug('Inference request failed:', error);
    throw new Error('Inference failed. Please try again.');
  }
}
