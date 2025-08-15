import axios from 'axios';
import appConfig from '@config/appConfig';

export async function generateCompletion(prompt: string): Promise<string> {
  const response = await axios.post('https://open-swarm.fly.dev/v1/completions', {
    model: 'university',
    prompt,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appConfig.get('API_AUTH_TOKEN') as string}`,
    },
  });

  return response.data.choices[0].text;
}
