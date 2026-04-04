import { http } from '../../utils/httpClient';
import openaiConfig from '../../config/openaiConfig';

export async function generateCompletion(prompt: string): Promise<string> {
  const model = openaiConfig.get('OPENAI_MODEL') || 'free-small';
  const targetUrl = 'https://open-swarm.fly.dev/v1/completions';

  const data = await http.post<{ choices: Array<{ text: string }> }>(
    targetUrl,
    { model, prompt },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_AUTH_TOKEN}`,
      },
      timeout: 15000,
    }
  );

  return data.choices[0].text;
}
