import { IMessage } from '@src/message/interfaces/IMessage';

const mockMessage: IMessage = {
  role: 'user',
  content: 'Hello, OpenAI!',
  client: {},
  channelId: '1234567890',
  data: {},
  getMessageId: () => 'message-id',
  getText: () => 'Hello, OpenAI!',
  getChannelId: () => '1234567890',
  getAuthorId: () => 'user-id',
  getChannelTopic: () => 'General',
  getUserMentions: () => [],
  getChannelUsers: () => [],
  isReplyToBot: () => false,
  mentionsUsers: () => false,
  isFromBot: () => false, // Added property
  reply: () => 'Reply content', // Added property
  getAuthorName: () => 'User Name', // Added property
};

export { mockMessage };
