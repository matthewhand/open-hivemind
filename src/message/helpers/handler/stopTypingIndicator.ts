import { sendTyping } from '@src/message/helpers/handler/sendTyping';

/**
 * Stops the typing indicator in a specified channel.
 * @param channel - The channel object where the typing indicator is active.
 */
export function stopTypingIndicator(channel: any): void {
    if (!channel) return;
    clearInterval(channel.typingInterval);
}
