import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const messageConfig = configManager.getConfig('message');
const llmConfig = llmConfig;

export function shouldProcessMessage(lastMessageTime: number): boolean {
    if (!messageConfig || !llmConfig) {
        throw new Error('Message or LLM configuration is not loaded.');
    }

    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const minIntervalMs = messageConfig.get<number>('MESSAGE_MIN_INTERVAL_MS');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const followUpEnabled = messageConfig.get<boolean>('MESSAGE_FOLLOW_UP_ENABLED');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const limitPerHour = llmConfig.get<number>('LLM_MESSAGE_LIMIT_PER_HOUR');

    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;

    if (timeSinceLastMessage < minIntervalMs) {
        return false;
    }

    if (followUpEnabled) {
        // Additional logic for follow-up enabled scenario
    }

    return true;
}
