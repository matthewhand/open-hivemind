/**
 * IMessage interface defines the structure of a message object.
 *
 * It includes methods for retrieving the message's text content, author information,
 * channel information, and providing a reply mechanism.
 */
export interface IMessage {
  getText(): string;
  getMessageId(): string;
  getAuthorId(): string;
  getChannelId(): string;
  getChannelTopic(): string;
  isFromBot(): boolean;
  reply(content: string): void;
}
