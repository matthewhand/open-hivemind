import fs from 'fs';
import axios from 'axios';
import Debug from 'debug';
import openWebUIConfig from './openWebUIConfig';
import { getSessionKey } from './sessionManager';

const debug = Debug('app:uploadKnowledgeFile');
let knowledgeFileId: string | null = null; // Cache the knowledge file ID in memory.
let uploadPromise: Promise<void> | null = null; // Track in-flight upload requests.

/**
 * Uploads the knowledge file to Open WebUI on startup.
 * Caches the file ID for use during inference requests.
 * Throws an error if the file upload fails.
 *
 * This function is concurrency-safe: multiple simultaneous calls will share
 * the same upload request and return the same file ID.
 */
export async function uploadKnowledgeFileOnStartup(): Promise<void> {
  // Return immediately if already uploaded
  if (knowledgeFileId) {
    debug('Knowledge file already uploaded, ID:', knowledgeFileId);
    return;
  }

  // If there's already an in-flight upload, wait for it instead of making a duplicate
  if (uploadPromise) {
    debug('Waiting for in-flight knowledge file upload');
    return uploadPromise;
  }

  // Create a new upload promise
  uploadPromise = performUpload();

  try {
    await uploadPromise;
  } finally {
    // Clear the in-flight promise so future calls can retry if needed
    uploadPromise = null;
  }
}

/**
 * Internal function to perform the actual upload.
 * Separated from uploadKnowledgeFileOnStartup to enable promise deduplication.
 */
async function performUpload(): Promise<void> {
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
    const response = await axios.post(apiUrl + '/v1/files', fileData, { headers, timeout: 30000 });

    const newKnowledgeFileId = response.data.fileId;
    if (!newKnowledgeFileId) {
      throw new Error('Failed to obtain a valid knowledge file ID from the server.');
    }

    knowledgeFileId = newKnowledgeFileId;
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

/**
 * Clears the cached knowledge file ID, forcing a re-upload on the next request.
 * Useful for testing or when the file needs to be refreshed.
 */
export function clearKnowledgeFileId(): void {
  debug('Clearing cached knowledge file ID');
  knowledgeFileId = null;
  uploadPromise = null;
}
