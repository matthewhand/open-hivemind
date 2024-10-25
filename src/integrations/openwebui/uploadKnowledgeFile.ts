import fs from 'fs';
import axios from 'axios';
import { getSessionKey } from './sessionManager';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:uploadKnowledgeFile');
let knowledgeFileId: string | null = null; // Cache the knowledge file ID in memory.

/**
 * Uploads the knowledge file to Open WebUI on startup.
 * Caches the file ID for use during inference requests.
 * Throws an error if the file upload fails.
 */
export async function uploadKnowledgeFileOnStartup(): Promise<void> {
  const { apiUrl, knowledgeFile } = openWebUIConfig.getProperties();

  if (!knowledgeFile) {
    debug('Knowledge file path is not configured.');
    throw new Error('Knowledge file path is missing in the configuration.');
  }

  if (!fs.existsSync(knowledgeFile)) {
    debug('Knowledge file not found:', knowledgeFile);
    throw new Error('Knowledge file does not exist at: ' + knowledgeFile);
  }

  debug('Uploading knowledge file:', knowledgeFile);

  try {
    const sessionKey = await getSessionKey();
    const headers = {
      Authorization: 'Bearer ' + sessionKey,
      'Content-Type': 'multipart/form-data',
    };

    const fileData = fs.createReadStream(knowledgeFile);
    const response = await axios.post(apiUrl + '/v1/files', fileData, { headers });

    knowledgeFileId = response.data.fileId;
    if (!knowledgeFileId) {
      throw new Error('Failed to obtain a valid knowledge file ID from the server.');
    }

    debug('Knowledge file uploaded successfully. File ID: ' + knowledgeFileId);
  } catch (error) {
    debug('File upload failed:', error);
    throw new Error('Knowledge file upload failed');
  }
}

/**
 * Retrieves the cached knowledge file ID.
 * Throws an error if the file ID is missing, indicating an upload issue.
 * @returns {string} The knowledge file ID.
 */
export function getKnowledgeFileId(): string {
  if (!knowledgeFileId) {
    throw new Error('Knowledge file ID is not available. Ensure the file is uploaded.');
  }

  return knowledgeFileId;
}
