import config from 'config';

/**
 * ConfigurationManager class handles dynamic loading of configurations
 * from config files. It allows for easy access to any configuration
 * property and provides the ability to use default values.
 */
class ConfigurationManager {
    private config: any;

    constructor() {
        // Load configuration from the config files (e.g., config/default.json)
        this.config = config;
    }

    /**
     * General method to retrieve configuration values.
     * @param key - The key of the configuration to retrieve.
     * @param defaultValue - An optional default value if the key is not found.
     * @returns The value of the configuration key, or the default value.
     */
    getConfig<T>(key: string, defaultValue?: T): T {
        return this.config.has(key) ? this.config.get(key) : defaultValue!;
    }

    /**
     * Dynamic property access for configuration values.
     * This method allows accessing any configuration key dynamically.
     * Example: configManager.get('messagePlatform.discord.typingDelayMaxMs')
     * @param key - The key of the configuration to retrieve.
     * @returns The value of the configuration key.
     */
    get(key: string): any {
        return this.getConfig(key);
    }
}

// Example usage within the application
const configManager = new ConfigurationManager();

// Accessing configurations dynamically with or without default values
const botTypingDelayMax = configManager.getConfig('messagePlatform.discord.typingDelayMaxMs', 2000);
const interPartDelay = configManager.getConfig('messagePlatform.discord.interPartDelayMs', 500);
const botUserId = configManager.getConfig('messagePlatform.discord.clientId', 'default-bot-id');
const minMessageIntervalMs = configManager.getConfig('enabledModules.responseHandling.minDelayMs', 1000);
const llmMessageLimitPerHour = configManager.getConfig('LLM_MESSAGE_LIMIT_PER_HOUR', 100);
const llmMessageLimitPerDay = configManager.getConfig('LLM_MESSAGE_LIMIT_PER_DAY', 1000);

export default configManager;
