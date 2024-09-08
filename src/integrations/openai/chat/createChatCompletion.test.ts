import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createChatCompletion } from './createChatCompletion';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock IMessage with required fields and additional properties
const mockMessage: IMessage = {
  role: 'user',
  content: 'Hello',
  getAuthorId: () => 'user123',
  getAuthorName: () => 'User One',
  reply: async () => Promise.resolve(),
  client: {},
  channelId: '1234',
  getMessageId: () => '5678',
  getText: () => 'Hello',
  getChannelId: () => '1234',
  getChannelTopic: () => 'General',
  getUserMentions: () => [],
  getChannelUsers: () => ['user1', 'user2'],
  isReplyToBot: () => false,
  mentionsUsers: () => false,
  isFromBot: () => false,
  data: {} // Adding the missing data property
};

// Mock dependencies
const mockOpenAI = {
  chat: {
    completions: {
      create: async () => ({ choices: [{ message: { content: 'mock response' } }] }),
    },
  },
};

describe('createChatCompletion', () => {
  it('should return a valid completion response', async () => {
    const response = await createChatCompletion(
      mockOpenAI as any,
      [mockMessage],
      'system message',
      100
    );
    expect(response).to.equal('mock response');
  });

  it('should handle an empty completion response', async () => {
    const mockEmptyOpenAI = {
      chat: {
        completions: {
          create: async () => ({ choices: [] }),
        },
      },
    };
    const response = await createChatCompletion(
      mockEmptyOpenAI as any,
      [mockMessage],
      'system message',
      100
    );
    expect(response).to.equal('');
  });
});
