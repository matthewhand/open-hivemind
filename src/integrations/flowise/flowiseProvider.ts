import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { getFlowiseSdkResponse } from './flowiseSdkClient';
import flowiseConfig from './flowiseConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  private chatflowConversationId: string;
  private chatflowCompletionId: string;
  private apiKey: string;
  private apiEndpoint: string;

  constructor(config?: { 
    chatflowConversationId?: string; 
    chatflowCompletionId?: string; 
    apiKey?: string; 
    apiEndpoint?: string 
  }) {
    debug('Initializing FlowiseProvider...');
    const isTest = process.env.NODE_ENV === 'test';

    // Use injected config, then values from flowiseConfig, then (if in test) dummy values.
    this.chatflowConversationId =
      config?.chatflowConversationId ||
      flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID') ||
      (isTest ? 'dummy-chatflow-conversation' : undefined)!;
    this.chatflowCompletionId =
      config?.chatflowCompletionId ||
      flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID') ||
      (isTest ? 'dummy-chatflow-completion' : undefined)!;
    this.apiKey =
      config?.apiKey ||
      flowiseConfig.get('FLOWISE_API_KEY') ||
      (isTest ? 'dummy-flowise-api-key' : undefined)!;
    this.apiEndpoint =
      config?.apiEndpoint ||
      flowiseConfig.get('FLOWISE_API_ENDPOINT') ||
      (isTest ? 'http://dummy.flowise.endpoint' : undefined)!;

    debug(`Flowise Configuration:
      FLOWISE_CONVERSATION_CHATFLOW_ID: ${this.chatflowConversationId || 'NOT SET'},
      FLOWISE_COMPLETION_CHATFLOW_ID: ${this.chatflowCompletionId || 'NOT SET'},
      API_KEY: ${redactSensitiveInfo('apiKey', this.apiKey)},
      API_ENDPOINT: ${this.apiEndpoint || 'NOT SET'}
    `);

    // In non-test environments, throw an error if any critical config is missing.
    if (!isTest && (!this.chatflowConversationId || !this.chatflowCompletionId || !this.apiKey || !this.apiEndpoint)) {
      debug('Missing critical Flowise configuration items.');
      throw new Error('Flowise configuration is incomplete.');
    } else {
      debug('FlowiseProvider initialized successfully with all required configuration.');
    }
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  /**
   * Generates a chat completion using the Flowise SDK.
   */
  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Starting chat completion with Flowise...');

    if (!this.chatflowConversationId) {
      throw new Error('Flowise chatflowConversationId is not set.');
    }

    // (Optional) TODO: Handle metadata if needed in the prompt
    const prompt = `${userMessage}\n${historyMessages.map(m => m.getText()).join(' ')}`;
    debug(`Generated Prompt: ${prompt}`);

    debug('Using SDK client for chat completion');
    return await getFlowiseSdkResponse(prompt, this.chatflowConversationId);
  }

  /**
   * Generates a completion using the Flowise SDK.
   */
  async generateCompletion(prompt: string, systemPrompt: string = ''): Promise<string> {
    debug('Starting completion generation with Flowise...');

    if (!this.chatflowCompletionId) {
      throw new Error('Flowise chatflowCompletionId is not set.');
    }

    const combinedPrompt = `${systemPrompt}\n${prompt}`;
    debug(`Generated Combined Prompt: ${combinedPrompt}`);

    debug('Using SDK client for completion');
    return await getFlowiseSdkResponse(combinedPrompt, this.chatflowCompletionId);
  }
}

export default FlowiseProvider;
