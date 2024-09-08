import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createChatCompletion } from './createChatCompletion';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock IMessage with required fields and additional properties
const mockMessage: IMessage = {
  role: 'user',
  content: 'Hello',
  getAuthorId: () => 'user123',
  getAuthorName: () => 'User One', // Added missing property
  reply: async () => Promise.resolve(), // Corrected type to Promise<void>
  client: {},
  channelId: '1234',
  data: {},
  getMessageId: () => '5678',
  getText: () => 'Hello',
  getChannelId: () => '1234',
  getChannelTopic: () => 'General',
  getUserMentions: () => [],
  getChannelUsers: () => ['user1', 'user2'],
  isReplyToBot: () => false,
  mentionsUsers: () => false,
  isFromBot: () => false
};

// Guard to validate IMessage interface properties
if (!mockMessage.getChannelUsers || !mockMessage.isReplyToBot || !mockMessage.reply || !mockMessage.getAuthorName) {
  throw new Error('mockMessage does not conform to IMessage interface');
}

// Mock dependencies
const mockOpenAI = {
  chat: {
    completions: {
      create: async () => ({ choices: [{ message: { content: 'mock response' } }] }),
    },
  },
};

// Debug logging
console.debug('Calling createChatCompletion with message ID:', mockMessage.getMessageId(), 'and content:', mockMessage.getText());

describe('createChatCompletion', () => {
  it('should return a valid completion response', async () => {
    const response = await createChatCompletion(
      mockOpenAI as any,
      [mockMessage],
      'system message',
      100
    );
    console.debug('Received response with message ID:', mockMessage.getMessageId(), 'Response:', response);
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
    console.debug('Received empty response with message ID:', mockMessage.getMessageId(), 'Response:', response);
    expect(response).to.equal('');
  });
});
