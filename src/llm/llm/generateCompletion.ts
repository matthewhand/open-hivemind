import axios from 'axios';

export async function generateCompletion(prompt: string): Promise<string> {
  const response = await axios.post('https://open-swarm.fly.dev/v1/completions', {
    model: 'university',
    prompt,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
    },
  });

  return response.data.choices[0].text;
}
