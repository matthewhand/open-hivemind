import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';

/**
 * Fetches and returns a list of available chat flows from the Flowise API.
 * @returns {Promise<string>} Formatted list of chat flows with their IDs and names.
 */
export const flowiseListChatFlows = async (): Promise<string> => {
  const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT');
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

  const response = await axios.get(`${baseURL}/chatflows`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return response.data.map((flow: any) => `${flow.id}: ${flow.name}`).join('\n');
};
