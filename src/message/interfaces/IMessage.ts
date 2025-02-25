import Debug from 'debug';

const debug = Debug('app:IMessage');

export abstract class IMessage {
  public content: string = "";  // Text content
  public channelId: string = "";  // Channel ID
  public data: any;               // Raw data associated with the message
  public role: string;            // e.g. "user", "assistant", "system", "tool"
  public metadata?: any;          // Optional extra metadata
  public tool_call_id?: string;   // Required for "tool" role, links to tool call
  public tool_calls?: any[];      // Optional for "assistant" role, tool invocations

  constructor(data: any, role: string, metadata?: any, tool_call_id?: string, tool_calls?: any[]) {
    if (new.target === IMessage) {
      throw new TypeError('Cannot construct IMessage instances directly');
    }
    this.data = data;
    this.role = role;
    this.metadata = metadata;
    this.tool_call_id = tool_call_id;
    this.tool_calls = tool_calls;
    debug('IMessage initialized with metadata:', metadata, 'tool_call_id:', tool_call_id);
  }

  abstract getMessageId(): string;

  /**
   * Retrieves the text content or tool response content of the message.
   * For "tool" role, returns the content field; implementations may override for custom behavior.
   */
  getText(): string {
    if (this.role === 'tool') {
      return this.content;  // Default to content, override in implementations if needed
    }
    return this.content;
  }

  abstract getTimestamp(): Date;
  public abstract setText(text: string): void;
  abstract getChannelId(): string;
  abstract getAuthorId(): string;
  abstract getChannelTopic(): string | null;
  abstract getUserMentions(): string[];
  abstract getChannelUsers(): string[];
  isReplyToBot(): boolean { return false; }
  abstract mentionsUsers(userId: string): boolean;
  abstract isFromBot(): boolean;
  abstract getAuthorName(): string;
}