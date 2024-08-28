import ConfigurationManager from '@config/ConfigurationManager';

const configManager = new ConfigurationManager();

export function shouldProcessMessage(lastMessageTime: number): boolean {
    const minInterval = configManager.MESSAGE_MIN_INTERVAL_MS;
    const followUpEnabled = configManager.MESSAGE_FOLLOW_UP_ENABLED;
    const messageLimitPerHour = configManager.LLM_MESSAGE_LIMIT_PER_HOUR;

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
