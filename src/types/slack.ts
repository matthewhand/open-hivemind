/**
 * Slack API Response Types
 *
 * This file contains TypeScript interfaces and types for Slack API responses,
 * replacing 'any' usage in Slack integrations.
 *
 * Based on analysis of:
 * - src/integrations/slack/SlackService.ts
 * - src/integrations/slack/SlackMessage.ts
 */

// ============================================================================
// Core Slack Message Types
// ============================================================================

/**
 * Raw Slack event data structure
 */
export interface SlackEventData {
  /** Event type identifier */
  type: string;
  /** Channel ID where event occurred */
  channel?: string;
  /** User ID who triggered the event or user information object */
  user?: string | SlackUserInfo;
  /** Message timestamp (seconds.milliseconds) */
  ts?: string;
  /** Thread timestamp for threaded messages */
  thread_ts?: string;
  /** Message text content */
  text?: string;
  /** Message subtype (e.g., 'bot_message') */
  subtype?: string;
  /** Bot ID for bot messages */
  bot_id?: string;
  /** Message ID */
  message_ts?: string;
  /** Event timestamp */
  event_ts?: string;
  /** Nested message data */
  message?: SlackMessageData;
  /** Username */
  username?: string;
}

/**
 * Slack message data structure
 */
export interface SlackMessageData {
  /** Message text */
  text?: string;
  /** User ID */
  user?: string;
  /** Timestamp */
  ts?: string;
  /** Thread timestamp */
  thread_ts?: string;
  /** Message subtype */
  subtype?: string;
  /** Bot ID */
  bot_id?: string;
}

/**
 * Slack user information
 */
export interface SlackUserInfo {
  /** User ID */
  id: string;
  /** Username */
  username?: string;
  /** Display name */
  name?: string;
}

// ============================================================================
// Slack API Response Types
// ============================================================================

/**
 * Slack Web API response wrapper
 */
export interface SlackApiResponse<T = unknown> {
  /** Whether the request was successful */
  ok: boolean;
  /** Response data */
  data?: T;
  /** Error message if ok is false */
  error?: string;
  /** Additional response metadata */
  response_metadata?: SlackResponseMetadata;
}

/**
 * Slack response metadata
 */
export interface SlackResponseMetadata {
  /** Next cursor for pagination */
  next_cursor?: string;
  /** Warnings from the API */
  warnings?: string[];
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Slack conversation history response
 */
export interface SlackConversationHistoryResponse extends SlackApiResponse {
  /** Array of messages */
  messages?: SlackMessageResponse[];
  /** Whether there are more messages */
  has_more?: boolean;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Slack message object from API
 */
export interface SlackMessageResponse {
  /** Message text */
  text?: string;
  /** User ID */
  user?: string;
  /** Bot ID */
  bot_id?: string;
  /** Timestamp */
  ts: string;
  /** Thread timestamp */
  thread_ts?: string;
  /** Message subtype */
  subtype?: string;
  /** Message attachments */
  attachments?: SlackAttachment[];
  /** Message blocks */
  blocks?: SlackBlock[];
  /** Message reactions */
  reactions?: SlackReaction[];
  /** File attachments */
  files?: SlackFile[];
  /** Edited timestamp */
  edited?: {
    user: string;
    ts: string;
  };
}

/**
 * Slack attachment structure
 */
export interface SlackAttachment {
  /** Attachment title */
  title?: string;
  /** Attachment text */
  text?: string;
  /** Attachment color */
  color?: string;
  /** Fallback text */
  fallback?: string;
  /** Attachment ID */
  id?: number;
  /** Author name */
  author_name?: string;
  /** Author link */
  author_link?: string;
  /** Author icon */
  author_icon?: string;
  /** Title link */
  title_link?: string;
  /** Image URL */
  image_url?: string;
  /** Thumbnail URL */
  thumb_url?: string;
  /** Footer text */
  footer?: string;
  /** Footer icon */
  footer_icon?: string;
  /** Timestamp */
  ts?: number;
  /** Attachment fields */
  fields?: SlackAttachmentField[];
  /** Actions */
  actions?: SlackAction[];
}

/**
 * Slack attachment field
 */
export interface SlackAttachmentField {
  /** Field title */
  title: string;
  /** Field value */
  value: string;
  /** Whether field is short */
  short?: boolean;
}

/**
 * Slack action structure
 */
export interface SlackAction {
  /** Action type */
  type: string;
  /** Action text */
  text?: string;
  /** Action URL */
  url?: string;
  /** Action value */
  value?: string;
  /** Action style */
  style?: string;
  /** Confirmation dialog */
  confirm?: SlackConfirmation;
}

/**
 * Slack confirmation dialog
 */
export interface SlackConfirmation {
  /** Dialog title */
  title: string;
  /** Dialog text */
  text: string;
  /** Confirm button text */
  confirm: string;
  /** Cancel button text */
  deny: string;
}

/**
 * Slack block structure
 */
export interface SlackBlock {
  /** Block type */
  type: string;
  /** Block ID */
  block_id?: string;
  /** Block elements */
  elements?: SlackBlockElement[];
  /** Block text */
  text?: SlackTextObject;
  /** Block fields */
  fields?: SlackTextObject[];
  /** Block accessory */
  accessory?: SlackBlockElement;
}

/**
 * Slack block element
 */
export interface SlackBlockElement {
  /** Element type */
  type: string;
  /** Element text */
  text?: SlackTextObject;
  /** Element action ID */
  action_id?: string;
  /** Element URL */
  url?: string;
  /** Element value */
  value?: string;
  /** Element placeholder */
  placeholder?: SlackTextObject;
  /** Element options */
  options?: SlackOption[];
}

/**
 * Slack text object
 */
export interface SlackTextObject {
  /** Text type */
  type: 'plain_text' | 'mrkdwn';
  /** Text content */
  text: string;
  /** Whether text is emoji */
  emoji?: boolean;
  /** Whether text is verbatim */
  verbatim?: boolean;
}

/**
 * Slack option for select menus
 */
export interface SlackOption {
  /** Option text */
  text: SlackTextObject;
  /** Option value */
  value: string;
  /** Option description */
  description?: SlackTextObject;
  /** Option URL */
  url?: string;
}

/**
 * Slack reaction structure
 */
export interface SlackReaction {
  /** Reaction name */
  name: string;
  /** Number of reactions */
  count: number;
  /** Users who reacted */
  users: string[];
}

/**
 * Slack file structure
 */
export interface SlackFile {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** File title */
  title?: string;
  /** File MIME type */
  mimetype?: string;
  /** File URL */
  url_private?: string;
  /** File thumbnail URL */
  thumb_url?: string;
  /** File size in bytes */
  size?: number;
  /** File timestamp */
  created?: number;
  /** File user ID */
  user?: string;
}

// ============================================================================
// Slack Channel Types
// ============================================================================

/**
 * Slack channel information
 */
export interface SlackChannel {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel type */
  type: 'public_channel' | 'private_channel' | 'im' | 'mpim';
  /** Channel topic */
  topic?: SlackChannelTopic;
  /** Channel purpose */
  purpose?: SlackChannelPurpose;
  /** Number of members */
  num_members?: number;
  /** Whether channel is archived */
  is_archived?: boolean;
  /** Whether channel is general */
  is_general?: boolean;
  /** Creator user ID */
  creator?: string;
  /** Creation timestamp */
  created?: number;
}

/**
 * Slack channel topic
 */
export interface SlackChannelTopic {
  /** Topic value */
  value: string;
  /** Creator user ID */
  creator: string;
  /** Last set timestamp */
  last_set: number;
}

/**
 * Slack channel purpose
 */
export interface SlackChannelPurpose {
  /** Purpose value */
  value: string;
  /** Creator user ID */
  creator: string;
  /** Last set timestamp */
  last_set: number;
}

// ============================================================================
// Slack User Types
// ============================================================================

/**
 * Slack user profile
 */
export interface SlackUserProfile {
  /** Display name */
  display_name?: string;
  /** Real name */
  real_name?: string;
  /** Email */
  email?: string;
  /** Phone */
  phone?: string;
  /** Status text */
  status_text?: string;
  /** Status emoji */
  status_emoji?: string;
  /** Profile image URLs */
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
}

/**
 * Slack user information
 */
export interface SlackUser {
  /** User ID */
  id: string;
  /** Username */
  name: string;
  /** Display name */
  profile?: SlackUserProfile;
  /** Whether user is a bot */
  is_bot?: boolean;
  /** Whether user is deleted */
  deleted?: boolean;
  /** Whether user is admin */
  is_admin?: boolean;
  /** Whether user is owner */
  is_owner?: boolean;
  /** Whether user is primary owner */
  is_primary_owner?: boolean;
  /** User timezone */
  tz?: string;
  /** User timezone label */
  tz_label?: string;
  /** User timezone offset */
  tz_offset?: number;
}

// ============================================================================
// Slack Event Types
// ============================================================================

/**
 * Slack event wrapper
 */
export interface SlackEvent {
  /** Event type */
  type: string;
  /** Event data */
  event: SlackEventData;
  /** Team ID */
  team_id?: string;
  /** API app ID */
  api_app_id?: string;
  /** Event ID */
  event_id?: string;
  /** Event timestamp */
  event_time?: number;
  /** Authorizations */
  authorizations?: SlackEventAuthorization[];
}

/**
 * Slack event authorization
 */
export interface SlackEventAuthorization {
  /** Enterprise ID */
  enterprise_id?: string;
  /** Team ID */
  team_id: string;
  /** User ID */
  user_id: string;
  /** Is bot */
  is_bot: boolean;
  /** Is enterprise install */
  is_enterprise_install: boolean;
}

// ============================================================================
// Slack Bot Configuration Types
// ============================================================================

/**
 * Slack bot instance configuration
 */
export interface SlackBotInstance {
  /** Bot token */
  token: string;
  /** Signing secret */
  signingSecret: string;
  /** Bot name */
  name: string;
  /** App token */
  appToken?: string;
  /** Default channel ID */
  defaultChannel?: string;
  /** Channels to join */
  joinChannels?: string;
  /** Bot mode */
  mode?: 'socket' | 'rtm';
}

/**
 * Slack bot configuration
 */
export interface SlackBotConfig {
  /** Bot name */
  name: string;
  /** Slack-specific configuration */
  slack: {
    /** Bot token */
    botToken: string;
    /** Signing secret */
    signingSecret?: string;
    /** App token */
    appToken?: string;
    /** Default channel ID */
    defaultChannelId?: string;
    /** Channels to join */
    joinChannels?: string;
    /** Bot mode */
    mode?: 'socket' | 'rtm';
  };
}

// ============================================================================
// Slack Interactive Types
// ============================================================================

/**
 * Slack interactive payload
 */
export interface SlackInteractivePayload {
  /** Payload type */
  type: string;
  /** Team ID */
  team: {
    id: string;
    domain: string;
  };
  /** User information */
  user: {
    id: string;
    name: string;
  };
  /** Channel information */
  channel: {
    id: string;
    name: string;
  };
  /** Action timestamp */
  action_ts: string;
  /** Message timestamp */
  message_ts: string;
  /** Attachment ID */
  attachment_id?: string;
  /** Token */
  token: string;
  /** Original message */
  original_message?: SlackMessageResponse;
  /** Response URL */
  response_url: string;
  /** Trigger ID */
  trigger_id?: string;
  /** Actions */
  actions?: SlackAction[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Slack event data
 */
export function isSlackEventData(obj: unknown): obj is SlackEventData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as SlackEventData).type === 'string'
  );
}

/**
 * Type guard for Slack API response
 */
export function isSlackApiResponse<T = unknown>(obj: unknown): obj is SlackApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ok' in obj &&
    typeof (obj as SlackApiResponse).ok === 'boolean'
  );
}

/**
 * Type guard for Slack message response
 */
export function isSlackMessageResponse(obj: unknown): obj is SlackMessageResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ts' in obj &&
    typeof (obj as SlackMessageResponse).ts === 'string'
  );
}

/**
 * Type guard for Slack channel
 */
export function isSlackChannel(obj: unknown): obj is SlackChannel {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'type' in obj &&
    typeof (obj as SlackChannel).id === 'string' &&
    typeof (obj as SlackChannel).name === 'string' &&
    typeof (obj as SlackChannel).type === 'string'
  );
}

/**
 * Type guard for Slack user
 */
export function isSlackUser(obj: unknown): obj is SlackUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    typeof (obj as SlackUser).id === 'string' &&
    typeof (obj as SlackUser).name === 'string'
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Union type for all Slack response types
 */
export type SlackResponse = SlackApiResponse | SlackMessageResponse | SlackChannel | SlackUser;

/**
 * Union type for all Slack event types
 */
export type SlackEventTypes = SlackEventData | SlackEvent;

/**
 * Slack provider metadata structure
 */
export interface SlackProviderMetadata {
  /** Channel ID for conversation context */
  channelId: string;
  /** User ID who sent the message */
  userId?: string;
  /** Platform identifier */
  platform: 'slack';
  /** Bot name */
  botName?: string;
  /** Team ID */
  teamId?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Slack message subtypes
 */
export const SLACK_MESSAGE_SUBTYPES = {
  BOT_MESSAGE: 'bot_message',
  MESSAGE_CHANGED: 'message_changed',
  MESSAGE_DELETED: 'message_deleted',
  CHANNEL_JOIN: 'channel_join',
  CHANNEL_LEAVE: 'channel_leave',
} as const;

/**
 * Slack channel types
 */
export const SLACK_CHANNEL_TYPES = {
  PUBLIC_CHANNEL: 'public_channel',
  PRIVATE_CHANNEL: 'private_channel',
  IM: 'im',
  MPIM: 'mpim',
} as const;

/**
 * Slack event types
 */
export const SLACK_EVENT_TYPES = {
  MESSAGE: 'message',
  APP_MENTION: 'app_mention',
  MEMBER_JOINED_CHANNEL: 'member_joined_channel',
  MEMBER_LEFT_CHANNEL: 'member_left_channel',
} as const;

export type SlackMessageSubtype =
  (typeof SLACK_MESSAGE_SUBTYPES)[keyof typeof SLACK_MESSAGE_SUBTYPES];
export type SlackChannelType = (typeof SLACK_CHANNEL_TYPES)[keyof typeof SLACK_CHANNEL_TYPES];
export type SlackEventType = (typeof SLACK_EVENT_TYPES)[keyof typeof SLACK_EVENT_TYPES];
