import axios from 'axios';
import Debug from 'debug';
import type { IMessage } from '@message/interfaces/IMessage';
import { withTimeout } from '@common/withTimeout';
import { globalRecoveryManager } from '../../utils/errorRecovery';
import { isSafeUrl } from '../../utils/ssrfGuard';
import openWebUIConfig from './openWebUIConfig';
import { getSessionKey } from './sessionManager';
import { getKnowledgeFileId } from './uploadKnowledgeFile';

const debug = Debug('app:runInference');

const DEFAULT_INFERENCE_TIMEOUT_MS = 30_000;

const circuitBreaker = globalRecoveryManager.getCircuitBreaker('openwebui', {
  failureThreshold: 5,
});

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

  return circuitBreaker.execute(async () => {
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
        history: historyMessages.map((msg) => msg.getText()),
        metadata: metadata || {},
      };
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

      if (!(await isSafeUrl(url))) {
        throw new Error('OpenWebUI API URL is not safe to connect to.');
      }

      const response = await withTimeout(
        (signal) => axios.post(url, payload, { headers, signal }),
        DEFAULT_INFERENCE_TIMEOUT_MS,
        'OpenWebUI inference'
      );

      debug('Inference result:', response.data);
      const responseText =
        typeof response.data === 'string' ? response.data : response.data.text || 'No response';
      return { text: responseText };
    } catch (error) {
      debug('Inference request failed:', error);
      throw new Error('Inference failed. Please try again.');
    }
  });
}
