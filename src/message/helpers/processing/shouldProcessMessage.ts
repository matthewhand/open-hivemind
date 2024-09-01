import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const messageConfig = configManager.getConfig('message');

export function shouldProcessMessage(lastMessageTime: number): boolean {
    if (!messageConfig) {
        throw new Error('Message configuration is not loaded.');
    }

    const minInterval = messageConfig.get<number>('MESSAGE_MIN_INTERVAL_MS');
    const followUpEnabled = messageConfig.get<boolean>('MESSAGE_FOLLOW_UP_ENABLED');
    const messageLimitPerHour = messageConfig.get<number>('MESSAGE_LLM_LIMIT_PER_HOUR');

    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;

    if (timeSinceLastMessage < minInterval) {
        return false;
    }

    if (followUpEnabled) {
        // Additional logic for follow-up enabled scenario
    }

    return true;
}
