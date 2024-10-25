import axios from 'axios';
import { getSessionKey } from './sessionManager';
import { getKnowledgeFileId } from './uploadKnowledgeFile';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:runInference');

/**
 * Executes inference using Open WebUI with the provided prompt and optional chat history.
 * 
 * @param prompt - The input prompt for the model.
 * @param history - Optional chat history.
 * @returns A promise resolving to the inference result.
 */
export async function generateChatCompletion(prompt: string, history: string[] = []): Promise<any> {
  const { apiUrl } = openWebUIConfig.getProperties();

  if (!prompt || prompt.trim() === '') {
    debug('Invalid prompt:', prompt);
    throw new Error('Prompt cannot be empty.');
  }

  const knowledgeFileId = getKnowledgeFileId();

  debug('Running inference with prompt:', prompt);
  debug('Using knowledge file ID:', knowledgeFileId);
  debug('History:', history);

  try {
    const sessionKey = await getSessionKey();
    const headers = {
      Authorization: 'Bearer ' + sessionKey,
      'Content-Type': 'application/json',
    };

    const url = apiUrl + '/chat/completions';
    const payload = { prompt, knowledgeFileId, history };
    const response = await axios.post(url, payload, { headers });

    debug('Inference result:', response.data);
    return response.data;
  } catch (error) {
    debug('Inference request failed:', error);
    throw new Error('Inference failed. Please try again.');
  }
}
