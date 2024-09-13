import { sendTyping } from '@integrations/discord/interaction/sendTyping';

export function stopTypingIndicator(channel: any): void {
    if (!channel) return;
    clearInterval(channel.typingInterval);
}
