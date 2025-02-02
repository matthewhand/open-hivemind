import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../integrations/openai/OpenAiService';  

const debug = Debug('app:openAiProvider');
const openAiService = OpenAiService.getInstance();

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[] = []
  ): Promise<string> => {
    debug('Delegating chat completion to OpenAiService...');

    let metadata: Record<string, string> | undefined = undefined;
    if (process.env.OPENAI_INCLUDE_METADATA === 'true' && historyMessages.length > 0) {
      const lastMessage = historyMessages[historyMessages.length - 1];
      metadata = {
        user: lastMessage.getAuthorId(),
        channel: lastMessage.getChannelId(),
      };
      debug('Including metadata in completion request:', metadata);
    }

    if (!historyMessages.length) {
      historyMessages = [{
        content: userMessage,
        channelId: 'unknown',
        data: {},
        role: 'user',
        getText: () => userMessage,
        isFromBot: () => false,
        getAuthorId: () => 'unknown',
        getChannelId: () => 'unknown',
        getTimestamp: () => new Date(),
        setText: function (text: string) { this.content = text; },
        getChannelTopic: () => null,
        getUserMentions: () => [],
        getChannelUsers: () => [],
        getAuthorName: () => 'unknown',
        isReplyToBot: () => false,
        getMessageId: () => 'mock-id',
        mentionsUsers: () => false,  
      }];
    }

    const metadataStr = metadata ? JSON.stringify(metadata) : undefined;
    const result = await openAiService.generateChatCompletion(userMessage, historyMessages, metadataStr);
    return result ?? 'No response generated.';
  },

  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return `Completion for: ${prompt}`;
  },
};
