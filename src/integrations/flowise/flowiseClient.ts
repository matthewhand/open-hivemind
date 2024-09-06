import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import axios from 'axios';

/**
 * Fetches data from Flowise API using the configured base URL and API key.
 * 
 * @returns {Promise<any>} The API response data.
 */
export async function getFlowiseData(): Promise<any> {
  const baseURL = flowiseConfig.get('FLOWISE_API_URL') as string;
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY') as string;

  if (!baseURL || !apiKey) {
    throw new Error('Flowise base URL or API key is missing.');
  }

  try {
    const response = await axios.get(baseURL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching data from Flowise API:', error);
    throw error;
  }
}
