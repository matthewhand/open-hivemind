import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import Debug from 'debug';
const debug = Debug('app:openAiProvider');

/**
 * OpenAI provider to generate responses based on full message history.
 *
 * @param {string} userMessage - The latest user message.
 * @param {IMessage[]} historyMessages - The history of previous messages.
 * @returns {Promise<string>} The generated response from OpenAI.
 */
export async function getOpenAiProvider(userMessage: string, historyMessages: IMessage[]): Promise<string> {
  const messages = historyMessages.map(msg => ({ role: msg.isFromBot() ? 'assistant' : 'user', content: msg.getText() }));
  messages.push({ role: 'user', content: userMessage });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const url = model.startsWith('gpt-') ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/completions';

  try {
    const response = await axios.post(
      url,
      {
        model,
        messages: model.startsWith('gpt-') ? messages : undefined,
        prompt: !model.startsWith('gpt-') ? messages.map(msg => msg.content).join('\n') : undefined,
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return model.startsWith('gpt-') ? response.data.choices[0].message.content : response.data.choices[0].text;
  } catch (error) {
    debug('Error generating response from OpenAI:', error.message);
    throw error;
  }
}
