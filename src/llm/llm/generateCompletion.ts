import Debug from 'debug';
import { OpenAI } from 'openai';
import axios from 'axios';
import { IMessage } from '@src/message/interfaces/IMessage';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig'; // Assuming Flowise config

const debug = Debug('app:sendCompletions');

/**
 * Sends a completion request using the configured LLM provider (OpenAI or Flowise).
 * @param {IMessage[]} messages - Array of messages for the completion.
 * @param {string} provider - The LLM provider ('openai' or 'flowise').
 * @returns {Promise<string>} - The generated response.
 */
export async function sendCompletions(messages: IMessage[], provider: string): Promise<string> {
  const prompt = messages.map(msg => msg.content).join(' ');
  debug(`Generated prompt: ${prompt}`);

  if (provider === 'openai') {
    // OpenAI logic
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        prompt,
        max_tokens: 150,
      });

      if (!response.choices || !response.choices.length) {
        throw new Error('No response from OpenAI');
      }

      const result = response.choices[0].text.trim();
      debug('Generated completion from OpenAI:', result);
      return result;
    } catch (error: any) {
      debug('Error sending completion via OpenAI:', error.message);
      throw new Error(`Failed to send completion via OpenAI: ${error.message}`);
    }
  } else if (provider === 'flowise') {
    // Flowise logic
    const flowiseEndpoint = flowiseConfig.get('FLOWISE_API_ENDPOINT');
    const chatflowId = flowiseConfig.get('FLOWISE_CHATFLOW_ID');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

    try {
      const response = await axios.post(`${flowiseEndpoint}/${chatflowId}`, {
        question: prompt,
        chatId: messages[0].channelId // Assuming the first message contains channelId
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });

      if (!response.data.text) {
        throw new Error('No response from Flowise');
      }

      const result = response.data.text.trim();
      debug('Generated completion from Flowise:', result);
      return result;
    } catch (error: any) {
      debug('Error sending completion via Flowise:', error.message);
      throw new Error(`Failed to send completion via Flowise: ${error.message}`);
    }
  } else {
    throw new Error('Invalid LLM provider specified');
  }
}
