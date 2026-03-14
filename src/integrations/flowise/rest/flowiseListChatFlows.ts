import axios from 'axios';
import { isSafeUrl } from '@hivemind/shared-types';
import flowiseConfig from '@integrations/flowise/flowiseConfig';

/**
 * Fetches and returns a list of available chat flows from the Flowise API.
 * @returns {Promise<string>} Formatted list of chat flows with their IDs and names.
 */
export const flowiseListChatFlows = async (): Promise<string> => {
  const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT');
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

  const targetUrl = `${baseURL}/chatflows`;
  if (!(await isSafeUrl(targetUrl))) {
    throw new Error('Flowise API URL is not safe to connect to.');
  }

  const response = await axios.get(targetUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return response.data.map((flow: any) => `${flow.id}: ${flow.name}`).join('\n');
};
