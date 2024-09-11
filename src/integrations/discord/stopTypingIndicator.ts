import { startTypingIndicator } from '../../integrations/discord/startTypingIndicator';

export function stopTypingIndicator(channel: any): void {
    if (!channel) return;
    clearInterval(channel.typingInterval);
}
