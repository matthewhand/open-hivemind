import config from 'config';
import logger from '@src/utils/logger';

class ConfigurationManager {
    /**
     * Retrieves the configuration value for the specified key.
     * @param key - The key of the configuration value.
     * @param defaultValue - The default value if the key is not found.
     * @returns The configuration value.
     */
    getConfig<T>(key: string, defaultValue?: T): T {
        try {
            const value = config.get<T>(key);
            return value;
        } catch (error) {
            logger.warn();
            return defaultValue as T;
        }
    }

    /**
     * Example configuration values that can be fetched dynamically.
     */
    public readonly BOT_TYPING_DELAY_MAX_MS: number = this.getConfig<number>('BOT_TYPING_DELAY_MAX_MS', 3000);
    public readonly INTER_PART_DELAY: number = this.getConfig<number>('INTER_PART_DELAY', 500);
    public readonly BOT_USER_ID: string = this.getConfig<string>('BOT_USER_ID', 'default_bot_id');
    public readonly MIN_MESSAGE_INTERVAL_MS: number = this.getConfig<number>('MIN_MESSAGE_INTERVAL_MS', 1000);
    public readonly LLM_MESSAGE_LIMIT_PER_HOUR: number = this.getConfig<number>('LLM_MESSAGE_LIMIT_PER_HOUR', 100);
    public readonly LLM_MESSAGE_LIMIT_PER_DAY: number = this.getConfig<number>('LLM_MESSAGE_LIMIT_PER_DAY', 1000);
}

export default new ConfigurationManager();
