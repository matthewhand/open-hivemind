import type { IMessage } from '@message/interfaces/IMessage';
/**
 * Discord-specific message provider that implements the low-level message transport interface.
 *
 * PURPOSE:
 * - Provides Discord-specific message retrieval functionality
 * - Wraps Discord.js messages with IMessage interface for platform abstraction
 * - Acts as a bridge between Discord.js and the application message system
 *
 * USAGE PATTERN:
 * This provider is typically used by higher-level services to fetch messages
 * from Discord channels without exposing Discord.js specifics to the rest
 * of the application.
 *
 * @example
 * ```typescript
 * const provider = new DiscordMessageProvider();
 * const messages = await provider.getMessages("123456789");
 * // Returns IMessage[] - platform-agnostic message objects
 * ```
 *
 * ARCHITECTURE NOTE:
 * This is a Discord-specific implementation that should be used alongside
 * other platform providers (SlackMessageProvider, etc.) for multi-platform support.
 */
export declare class DiscordMessageProvider {
    private discordSvc;
    constructor();
    /**
     * Retrieves messages from a Discord channel and converts them to IMessage format.
     *
     * @param channelId - The Discord channel ID to fetch messages from
     * @returns Promise resolving to an array of IMessage objects
     *
     * @example
     * ```typescript
     * const provider = new DiscordMessageProvider();
     * const messages = await provider.getMessages("123456789");
     * messages.forEach(msg => {
     *   console.log(`${msg.getAuthorName()}: ${msg.getText()}`);
     * });
     * ```
     *
     * ERROR HANDLING:
     * - Returns empty array if channel not found
     * - Returns empty array if bot lacks permissions
     * - Logs errors to console for debugging
     */
    getMessages(channelId: string): Promise<IMessage[]>;
    getForumOwner(forumId: string): Promise<string>;
}
//# sourceMappingURL=DiscordMessageProvider.d.ts.map