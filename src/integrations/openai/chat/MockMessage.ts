import { IMessage } from '@src/message/interfaces/IMessage';

export class MockMessage extends IMessage {
  userMentions: string[] = ['TestUser1', 'TestUser2'];
  messageReference: string | null = null;
  content = 'Test message';
  client = {};
  channelId = '12345';
  role = 'user';
  isReplyToBot = () => false;

  constructor(data: any) {
    super(data, 'user');
  }

  getMessageId(): string {
    return 'test-id';
  }

  getText(): string {
    return this.content;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getAuthorId(): string {
    return 'author-id';
  }

  getChannelTopic(): string {
    return 'Test Channel Topic';
  }

  getUserMentions(): string[] {
    return this.userMentions;
  }

  getChannelUsers(): string[] {
    return ['User1', 'User2'];
  }

  mentionsUsers(): boolean {
    return this.userMentions.length > 0;
  }

  isFromBot(): boolean {
    return false;
  }

  getAuthorName(): string {
    return 'Test Author';
  }

  reply = async (content: string): Promise<void> => {
    console.log('Replying with:', content);
  };
}
