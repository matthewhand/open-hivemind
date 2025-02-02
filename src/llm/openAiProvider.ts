import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');
const openAiService = OpenAiService.getInstance();

// Helper to create a dummy IMessage when history is empty.
function createDummyMessage(userMessage: string): IMessage {
  return {
    content: userMessage,
    channelId: 'mock-channel',
    data: {},
    role: 'user',
    getText: () => userMessage,
    isFromBot: () => false,
    getAuthorId: () => 'mock-user',
    getChannelId: () => 'mock-channel',
    getTimestamp: () => new Date(),
    // Note: In this project, getUserMentions is expected to return string[]
    getUserMentions: () => [],
    // Similarly, mentionsUsers is expected to return a boolean now.
    mentionsUsers: () => false,
    getChannelUsers: () => [],
    getAuthorName: () => 'Mock User',
    isReplyToBot: () => false,
    getMessageId: () => 'mock-id',
    setText: function(text: string) { this.content = text; }
  } as IMessage;
}

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat completion using OpenAI's service.
   */
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> => {
    debug('Delegating chat completion to OpenAiService...');

    if (!historyMessages.length) {
      historyMessages = [createDummyMessage(userMessage)];
    }

    debug('History Messages:', historyMessages);

    // Here, ensure that metadata is a string if expected, or pass undefined.
    const metadataParam = typeof metadata === 'string' ? metadata : undefined;

    const result = await openAiService.generateChatCompletion(userMessage, historyMessages, metadataParam);
    return result ?? 'No response generated.';
  },

  /**
   * Minimal implementation of generateCompletion to satisfy ILlmProvider.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return `Completion for: ${prompt}`;  // Placeholder for now.
  },
};
