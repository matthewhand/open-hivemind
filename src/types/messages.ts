/**
 * Centralized TypeScript interfaces for message data structures used across the
 * application. These types replace loosely‑typed `any` usages in the messaging
 * layer, providing stronger compile‑time guarantees while remaining backward
 * compatible with existing implementations.
 *
 * The interfaces are deliberately minimal and platform‑agnostic; platform‑specific
 * raw payloads are captured by `RawMessageData`. Consumers can extend these
 * definitions as needed for additional fields.
 */

/**
 * Raw platform‑specific message payload.
 * Represents the original object received from Discord, Slack, Telegram, etc.
 * The shape varies per provider, so we keep it loosely typed but encapsulated.
 */
export interface RawMessageData {
  [key: string]: unknown;
}

/**
 * Enumerates the possible roles a message can have.
 * Additional custom roles are allowed via string index signature.
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | (string & {});

/**
 * Represents a tool call embedded in a message (e.g., OpenAI function calls).
 */
export interface ToolCall {
  /** Unique identifier for the tool call */
  id: string;
  /** The type of tool (e.g., "function") */
  type: string;
  /** Details of the function being invoked */
  function: {
    /** Name of the function */
    name: string;
    /** JSON‑encoded arguments */
    arguments: string;
  };
}

/**
 * Core message interface used throughout the codebase.
 *
 * It mirrors the abstract `IMessage` class but provides explicit typing.
 * Existing implementations (DiscordMessage, SlackMessage, etc.) can implement
 * this interface to satisfy the new type contracts.
 */
export interface Message {
  /** Unique identifier for the message (platform‑specific) */
  id: string;
  /** Textual content of the message */
  content: string;
  /** Canonical channel identifier (provider‑agnostic) */
  channelId: string;
  /** Role of the sender */
  role: MessageRole;
  /** Platform source of the message */
  platform: 'discord' | 'slack' | 'telegram' | 'mattermost' | (string & {});
  /** Raw platform payload */
  data: RawMessageData;
  /** Optional metadata (timestamp, userId, etc.) */
  metadata?: {
    timestamp: string;
    channelId: string;
    userId: string;
    botId?: string;
    platform: 'discord' | 'slack' | 'telegram' | 'mattermost';
    [key: string]: unknown;
  };
  /** Optional tool call identifier for messages of role "tool" */
  toolCallId?: string;
  /** Optional array of tool calls for assistant messages */
  toolCalls?: ToolCall[];
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Payload used for public announcements. The shape varies per platform,
 * therefore it is defined as a generic record.
 */
export interface AnnouncementPayload {
  [key: string]: unknown;
}
