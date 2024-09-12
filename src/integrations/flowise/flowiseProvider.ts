/**
 * FlowiseProvider is an integration that provides connection to Flowise, an LLM orchestration service.
 * It supports chat completion and completion tasks using Flowise SDK.
 * This class handles authentication, fallback mechanisms, and supports both SDK and HTTP API communication.
 */

import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import { FlowiseClient } from 'flowise-sdk';
import Debug from 'debug';
import axios from 'axios';

const debug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  client: FlowiseClient | null = null;

  constructor() {
    this.initializeClient();
  }

  /**
   */
  async initializeClient() {
    const flowiseUrl = flowiseConfig.get('FLOWISE_API_ENDPOINT');
  }

  supportsChatCompletion() {
    return true;
  }

  supportsCompletion() {
    return true;
  }

  async generateChatCompletion(historyMessages: IMessage[] = []): Promise<string> {
    const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');

    // Reverse the order of history messages so the latest comes last
    const reversedHistory = historyMessages.reverse();
    let userMessage = '';
    if (reversedHistory.length > 0) {
      userMessage = reversedHistory[reversedHistory.length - 1].getText();
      debug('Using message from reversed history:', userMessage);
    } else {
      debug('No message history provided, using fallback message.');
      userMessage = 'User input missing.';
    }

    debug('Using Flowise SDK for chat completion with message:', userMessage);

    if (!this.client) {
      throw new Error('Flowise client is not initialized.');
    }

    try {
      const payload = {
        chatflowId,
        question: userMessage,
        streaming: false,
      };

      debug('Sending payload to Flowise:', payload);
      const completion = await this.client.getChatCompletion(payload);
      if (completion) {
        debug('Flowise SDK raw response:', completion);
        const response = completion?.text || 'No response generated';
        debug('Flowise SDK processed response:', response);
        return response;
      } else {
        throw new Error('Completion response was undefined.');
      }
    } catch (sdkError) {
      debug('Flowise SDK failed:', sdkError);
      if (flowiseConfig.get('FLOWISE_ENABLE_FALLBACK')) {
        return await fallbackToHttpApi(userMessage, chatflowId);
      }
      throw sdkError;
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    const chatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    debug('Using Flowise SDK for completion');

    if (!this.client) {
      throw new Error('Flowise client is not initialized.');
    }

    try {
      const payload = {
        chatflowId,
        question: prompt,
        streaming: false,
      };

      debug('Sending payload to Flowise:', payload);
      const completion = await this.client.getCompletion(payload);
      if (completion) {
        debug('Flowise SDK raw response:', completion);
        const response = completion?.text || 'No response generated';
        debug('Flowise SDK processed response:', response);
        return response;
      } else {
        throw new Error('Completion response was undefined.');
      }
    } catch (sdkError) {
      debug('Flowise SDK failed:', sdkError);
      if (flowiseConfig.get('FLOWISE_ENABLE_FALLBACK')) {
        return await fallbackToHttpApi(prompt, chatflowId);
      }
      throw sdkError;
    }
  }
}

/**
 * Authenticate and retrieve API key if username/password is provided or fallback to default API key.
 */
async function getApiKey() {
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
  const username = process.env.FLOWISE_USERNAME;
  const password = process.env.FLOWISE_PASSWORD;

  if (apiKey) return apiKey;
  if (!username || !password) throw new Error('Flowise credentials are missing.');

  try {
    debug('Authenticating via username/password...');
    const authResponse = await axios.post(
      `${flowiseConfig.get('FLOWISE_API_ENDPOINT')}/auth/login`,
      { username, password }
    );

    const token = authResponse.data?.token;
    if (!token) throw new Error('Failed to retrieve API token from username/password.');
    return token;
  } catch (authError) {
    debug('Authentication failed:', authError);
    throw new Error('Unable to authenticate using username and password.');
  }
}

/**
 * Fallback to HTTP API if Flowise SDK fails.
 */
async function fallbackToHttpApi(question: string, chatflowId: string) {
  const apiUrl = `${flowiseConfig.get('FLOWISE_API_ENDPOINT')}/chatflows/${chatflowId}`;
  debug(`Falling back to HTTP API at ${apiUrl}`);

  try {
    const response = await axios.post(
      apiUrl,
      { question },
      { headers: { Authorization: `Bearer ${await getApiKey()}`, 'Content-Type': 'application/json' } }
    );

    if (response.data?.text) {
      return response.data.text;
    }

    throw new Error('No valid response from Flowise HTTP API.');
  } catch (httpError) {
    debug('Flowise HTTP API failed:', httpError);
    throw httpError;
  }
}

export const flowiseProvider = new FlowiseProvider();
