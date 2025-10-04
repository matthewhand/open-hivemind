/**
 * Discord API Response Interfaces
 * 
 * This file defines TypeScript interfaces for Discord API responses to replace 'any' types
 * throughout the codebase. These interfaces provide type safety for Discord API interactions,
 * including message objects, user data, channel information, and other Discord-specific entities.
 */

import { Collection } from 'discord.js';

// Base Discord API Response Types
export interface DiscordAPIResponse {
  ok: boolean;
  data?: any;
  error?: DiscordAPIError;
}

export interface DiscordAPIError {
  code: number;
  message: string;
  errors?: Record<string, any>;
}

// Discord Message Types
export interface DiscordMessage {
  id: string;
  channel_id: string;
 guild_id?: string;
  author: DiscordUser;
  member?: DiscordGuildMember;
  content: string;
  timestamp: string;
  edited_timestamp?: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  mention_roles: string[];
  mention_channels?: DiscordChannelMention[];
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions?: DiscordReaction[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: number;
  activity?: DiscordMessageActivity;
  application?: DiscordMessageApplication;
  message_reference?: DiscordMessageReference;
  flags?: number;
 referenced_message?: DiscordMessage | null;
 interaction?: DiscordMessageInteraction;
  thread?: DiscordChannel;
  components?: DiscordMessageComponent[];
  sticker_items?: DiscordStickerItem[];
  stickers?: DiscordSticker[];
  position?: number;
  role_subscription_data?: DiscordRoleSubscriptionData;
  guild_hashes?: DiscordGuildHashes;
  call?: DiscordCall;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar?: string | null;
 bot?: boolean;
 system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
 locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
  avatar_decoration_data?: DiscordAvatarDecorationData | null;
}

export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string | null;
  avatar?: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string | null;
  avatar_decoration_data?: DiscordAvatarDecorationData | null;
}

export interface DiscordChannelMention {
  id: string;
  guild_id: string;
  type: number;
  name: string;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null;
  width?: number | null;
  ephemeral?: boolean;
  duration_secs?: number;
  waveform?: string;
  flags?: number;
}

export interface DiscordEmbed {
  title?: string;
  type?: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link';
  description?: string;
  url?: string;
  timestamp?: string;
 color?: number;
  footer?: DiscordEmbedFooter;
  image?: DiscordEmbedImage;
  thumbnail?: DiscordEmbedThumbnail;
  video?: DiscordEmbedVideo;
  provider?: DiscordEmbedProvider;
  author?: DiscordEmbedAuthor;
 fields?: DiscordEmbedField[];
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface DiscordEmbedImage {
  url?: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedThumbnail {
  url?: string;
 proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedVideo {
  url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedProvider {
  name?: string;
 url?: string;
}

export interface DiscordEmbedAuthor {
  name?: string;
  url?: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordReaction {
  count: number;
  count_details: DiscordReactionCountDetails;
  me: boolean;
  me_burst: boolean;
  emoji: DiscordEmoji;
  burst_colors: string[];
}

export interface DiscordReactionCountDetails {
  burst: number;
  normal: number;
}

export interface DiscordEmoji {
  id?: string;
  name?: string;
  roles?: string[];
  user?: DiscordUser;
  require_colons?: boolean;
  managed?: boolean;
  available?: boolean;
}

export interface DiscordMessageActivity {
  type: number;
  party_id?: string;
}

export interface DiscordMessageApplication {
  id: string;
  description?: string;
  icon?: string | null;
  name: string;
  cover_image?: string;
  primary_sku_id?: string;
  role_connections_verification_url?: string;
}

export interface DiscordMessageReference {
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
  fail_if_not_exists?: boolean;
}

export interface DiscordMessageInteraction {
  id: string;
  type: number;
  name: string;
 user: DiscordUser;
  member?: DiscordGuildMember;
}

export interface DiscordMessageComponent {
  type: number;
  style?: number;
  label?: string;
  emoji?: DiscordPartialEmoji;
  custom_id?: string;
  disabled?: boolean;
  url?: string;
  options?: DiscordSelectOption[];
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  components?: DiscordMessageComponent[];
}

export interface DiscordPartialEmoji {
  id?: string;
  name?: string;
  animated?: boolean;
}

export interface DiscordSelectOption {
  label: string;
 value: string;
 description?: string;
  emoji?: DiscordPartialEmoji;
  default?: boolean;
}

export interface DiscordStickerItem {
  id: string;
  name: string;
  format_type: number;
}

export interface DiscordSticker {
  id: string;
  pack_id?: string;
  name: string;
  description: string | null;
  tags?: string;
  asset?: string;
  type: number;
  format_type: number;
  available?: boolean;
  guild_id?: string;
  user?: DiscordUser;
  sort_value?: number;
}

export interface DiscordRoleSubscriptionData {
  role_subscription_listing_id: string;
  tier_name: string;
  total_months_subscribed: number;
  is_renewal: boolean;
}

export interface DiscordGuildHashes {
  version: number;
  roles?: Record<string, string>;
  channels?: Record<string, string>;
  bans?: Record<string, string>;
}

export interface DiscordCall {
  participants: string[];
  ended_timestamp?: string | null;
}

export interface DiscordAvatarDecorationData {
  asset: string;
  sku_id: string;
}

// Discord Channel Types
export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  permission_overwrites?: DiscordOverwrite[];
  name?: string;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  recipients?: DiscordUser[];
  icon?: string | null;
  owner_id?: string;
  application_id?: string;
  managed?: boolean;
  parent_id?: string | null;
  last_pin_timestamp?: string | null;
  rtc_region?: string | null;
  video_quality_mode?: number;
  message_count?: number;
  member_count?: number;
  thread_metadata?: DiscordThreadMetadata;
  member?: DiscordThreadMember;
  default_auto_archive_duration?: number;
  permissions?: string;
  flags?: number;
  total_message_sent?: number;
  available_tags?: DiscordTag[];
  applied_tags?: string[];
  default_reaction_emoji?: DiscordDefaultReaction;
  default_thread_rate_limit_per_user?: number;
  default_sort_order?: number | null;
  default_forum_layout?: number;
  voice_states?: DiscordVoiceState[];
  members?: DiscordThreadMember[];
}

export interface DiscordOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

export interface DiscordThreadMetadata {
  archived: boolean;
  auto_archive_duration: number;
  archive_timestamp: string;
 locked: boolean;
  invitable?: boolean;
  create_timestamp?: string | null;
}

export interface DiscordThreadMember {
  id?: string;
  user_id?: string;
  join_timestamp: string;
  flags: number;
  member?: DiscordGuildMember;
}

export interface DiscordTag {
  id: string;
  name: string;
 moderated: boolean;
  emoji_id?: string | null;
  emoji_name?: string | null;
}

export interface DiscordDefaultReaction {
  emoji_id?: string | null;
  emoji_name?: string | null;
}

// Discord Guild Types
export interface DiscordGuild {
  id: string;
  name: string;
 icon?: string | null;
  icon_hash?: string | null;
  splash?: string | null;
  discovery_splash?: string | null;
  owner?: boolean;
  owner_id: string;
  permissions?: string;
  afk_channel_id?: string | null;
  afk_timeout: number;
  widget_enabled?: boolean;
  widget_channel_id?: string | null;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  features: string[];
  mfa_level: number;
  application_id?: string | null;
  system_channel_id?: string | null;
  system_channel_flags: number;
  rules_channel_id?: string | null;
  max_presences?: number | null;
  max_members?: number;
  vanity_url_code?: string | null;
 description?: string | null;
  banner?: string | null;
  premium_tier: number;
  premium_subscription_count?: number;
  preferred_locale: string;
  public_updates_channel_id?: string | null;
  max_video_channel_users?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  welcome_screen?: DiscordWelcomeScreen;
  nsfw_level: number;
  stickers?: DiscordSticker[];
  premium_progress_bar_enabled: boolean;
  safety_alerts_channel_id?: string | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
 position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: DiscordRoleTags;
}

export interface DiscordRoleTags {
  bot_id?: string;
  integration_id?: string;
  premium_subscriber?: null;
  subscription_listing_id?: string;
  available_for_purchase?: null;
  guild_connections?: null;
}

export interface DiscordWelcomeScreen {
  description?: string | null;
  welcome_channels: DiscordWelcomeScreenChannel[];
}

export interface DiscordWelcomeScreenChannel {
  channel_id: string;
  description: string;
  emoji_id?: string | null;
  emoji_name?: string | null;
}

// Discord Voice Types
export interface DiscordVoiceState {
  guild_id?: string;
  channel_id: string | null;
  user_id: string;
  member?: DiscordGuildMember;
  session_id: string;
  deaf: boolean;
  mute: boolean;
  self_deaf: boolean;
  self_mute: boolean;
  self_stream?: boolean;
  self_video: boolean;
  suppress: boolean;
  request_to_speak_timestamp: string | null;
}

// Discord Interaction Types
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel?: DiscordChannel;
  channel_id?: string;
  member?: DiscordGuildMember;
  user?: DiscordUser;
  token: string;
  version: number;
  message?: DiscordMessage;
  app_permissions?: string;
  locale?: string;
  guild_locale?: string;
  entitlements: DiscordEntitlement[];
}

export interface DiscordInteractionData {
  id?: string;
  name?: string;
  type?: number;
  resolved?: DiscordResolvedData;
  options?: DiscordInteractionDataOption[];
  custom_id?: string;
  component_type?: number;
  values?: string[];
  target_id?: string;
  components?: DiscordMessageComponent[];
}

export interface DiscordInteractionDataOption {
  name: string;
  type: number;
  value?: any;
  options?: DiscordInteractionDataOption[];
  focused?: boolean;
}

export interface DiscordResolvedData {
  users?: Record<string, DiscordUser>;
  members?: Record<string, DiscordGuildMember>;
  roles?: Record<string, DiscordRole>;
  channels?: Record<string, DiscordChannel>;
  messages?: Record<string, DiscordMessage>;
  attachments?: Record<string, DiscordAttachment>;
}

export interface DiscordEntitlement {
  id: string;
  sku_id: string;
  user_id?: string;
  guild_id?: string;
  application_id: string;
  type: number;
  consumed: boolean;
  starts_at?: string;
  ends_at?: string;
}

// Discord Client and Bot Types
export interface DiscordBot {
  client: any; // Discord.js Client
  botUserId: string;
  botUserName: string;
  config: DiscordBotConfig;
}

export interface DiscordBotConfig {
  name: string;
  token: string;
  discord: {
    token: string;
  };
  llmProvider?: string;
  llm?: any;
}

// Discord Message Provider Types
export interface DiscordMessageProvider {
  getMessages(channelId: string): Promise<DiscordMessage[]>;
  getForumOwner(forumId: string): Promise<string>;
}

// Type Guards for Runtime Type Checking
export function isDiscordMessage(obj: any): obj is DiscordMessage {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.channel_id === 'string' && 
         typeof obj.content === 'string' &&
         obj.author && typeof obj.author.id === 'string';
}

export function isDiscordUser(obj: any): obj is DiscordUser {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.username === 'string';
}

export function isDiscordChannel(obj: any): obj is DiscordChannel {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'number';
}

export function isDiscordGuild(obj: any): obj is DiscordGuild {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.name === 'string';
}

export function isDiscordAPIResponse(obj: any): obj is DiscordAPIResponse {
  return obj && 
         typeof obj.ok === 'boolean';
}

export function isDiscordAPIError(obj: any): obj is DiscordAPIError {
  return obj && 
         typeof obj.code === 'number' && 
         typeof obj.message === 'string';
}