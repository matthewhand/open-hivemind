import axios from 'axios';
import { isSafeUrl } from '@src/utils/ssrfGuard';
import openaiConfig from '../../config/openaiConfig';

export async function generateCompletion(prompt: string): Promise<string> {
  const model = openaiConfig.get('OPENAI_MODEL') || 'free-small';
  const targetUrl = 'https://open-swarm.fly.dev/v1/completions';

  if (!(await isSafeUrl(targetUrl))) {
    throw new Error('API URL is not safe to connect to.');
  }

  const response = await axios.post(
    targetUrl,
    {
      model,
      prompt,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_AUTH_TOKEN}`,
      },
      timeout: 15000,
    }
  );

  return response.data.choices[0].text;
}
