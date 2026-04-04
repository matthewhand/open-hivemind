import { http } from '@hivemind/shared-types';
import flowiseConfig from '@integrations/flowise/flowiseConfig';

/**
 * Fetches and returns a list of available chat flows from the Flowise API.
 * @returns {Promise<string>} Formatted list of chat flows with their IDs and names.
 */
export const flowiseListChatFlows = async (): Promise<string> => {
  const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT');
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

  const data = await http.get<Array<{ id: string; name: string }>>(`${baseURL}/chatflows`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return data.map((flow) => `${flow.id}: ${flow.name}`).join('\n');
};
