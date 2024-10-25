import axios from 'axios';
import { getSessionKey } from './sessionManager';
import { getKnowledgeFileId } from './uploadKnowledgeFile';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:runInference');

/**
 * Executes inference using Open WebUI with the provided prompt and cached knowledge file ID.
 * Throws an error if the request fails or required data is missing.
 * 
 * @param {string} prompt - The input prompt for the model.
 * @returns {Promise<any>} - The inference result from Open WebUI.
 */
export async function runInference(prompt: string): Promise<any> {
  const { apiUrl } = openWebUIConfig.getProperties();

  // Guard: Ensure a valid prompt is provided.
  if (!prompt || prompt.trim() === '') {
    debug('Invalid prompt:', prompt);
    throw new Error('Prompt cannot be empty.');
  }

  const knowledgeFileId = getKnowledgeFileId(); // Retrieve the cached file ID.

  debug('Running inference with prompt:', prompt);
  debug('Using knowledge file ID:', knowledgeFileId);

  try {
    const sessionKey = await getSessionKey();
    const headers = {
      Authorization: 'Bearer ' + sessionKey,
      'Content-Type': 'application/json',
    };

    const url = apiUrl + '/chat/completions';
    const response = await axios.post(
      url,
      { prompt, knowledgeFileId },
      { headers }
    );

    debug('Inference result:', response.data);
    return response.data;
  } catch (error) {
    debug('Inference request failed:', error);
    throw new Error('Inference failed. Please try again.');
  }
}
