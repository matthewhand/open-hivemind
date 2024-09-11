import { sendTyping } from '../../integrations/discord/sendTyping';

export function stopTypingIndicator(channel: any): void {
    if (!channel) return;
    clearInterval(channel.typingInterval);
}
