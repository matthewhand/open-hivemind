import axios from 'axios';
import { IMessage } from '@message/interfaces/IMessage';

export async function generateChatCompletion(userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>): Promise<string> {
  const enrichedMessages = [
    { role: 'system', content: 'You are a bot that assists Slack users.' },
    {
      role: 'assistant',
      content: '',
      tool_calls: [{ id: `${Date.now()}.1234`, type: 'function', function: { name: 'get_metadata', arguments: '{}' } }],
    },
    {
      role: 'tool',
      tool_call_id: `${Date.now()}.1234`,
      content: JSON.stringify(metadata || {})
    },
    ...historyMessages.map(m => ({ role: m.role, content: m.getText() })),
    { role: 'user', content: userMessage }
  ];

  const response = await axios.post('https://open-swarm.fly.dev/v1/chat/completions', {
    model: 'university',
    messages: enrichedMessages,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
    },
  });

  return response.data.choices.slice(-1)[0].message.content;
}
