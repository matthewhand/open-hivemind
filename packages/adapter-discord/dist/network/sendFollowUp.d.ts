import type { Message } from 'discord.js';
/**
 * Send Follow-Up Message
 *
 * This module handles sending follow-up messages in response to an initial interaction.
 * It ensures the follow-up message is sent correctly and logs the action for debugging purposes.
 *
 * Key Features:
 * - Sends follow-up messages after an initial interaction
 * - Handles message formatting and sending
 * - Provides detailed logging for troubleshooting
 */
/**
 * Sends a follow-up message in the Discord channel.
 * @param message - The original message from the user.
 * @param followUpText - The follow-up text to send.
 * @returns A promise that resolves when the follow-up message is sent.
 */
export declare const sendFollowUp: (message: Message, followUpText: string) => Promise<void>;
//# sourceMappingURL=sendFollowUp.d.ts.map