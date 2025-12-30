/**
 * @hivemind/adapter-discord
 * 
 * Discord adapter for Open Hivemind messaging platform.
 * Implements IMessengerService for Discord integration.
 */

// Re-export the main Discord adapter (renamed from Service for clarity)
export { DiscordService as DiscordAdapter, DiscordService } from './DiscordService';

// Export message class
export { DiscordMessage } from './DiscordMessage';

// Export connection test utility
export { DiscordConnectionTest } from './DiscordConnectionTest';

// Export typing indicator
export { startTypingIndicator } from './startTypingIndicator';
