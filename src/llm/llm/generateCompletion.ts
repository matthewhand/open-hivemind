import axios from 'axios';
import openaiConfig from '../../config/openaiConfig';

export async function generateCompletion(prompt: string): Promise<string> {
  const model = openaiConfig.get('OPENAI_MODEL') || 'free-small';
  const response = await axios.post(
    'https://open-swarm.fly.dev/v1/completions',
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
