import convict from 'convict';
import Debug from 'debug';

const debug = Debug('app:ConfigurationManager');

// Define the convict schema for base configurations
const schema = convict({
    NODE_ENV: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
    }
});

/**
 * ConfigurationManager Class
 * 
 * Manages the application's configurations and sessions.
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private configs: Record<string, convict.Config<any>> = {};
    private sessionStore: Record<string, Record<string, string>> = {};

    /**
     * Private constructor for singleton pattern.
     */
    private constructor() {
        schema.validate({ allowed: 'strict' });
        const currentEnv = schema.get('NODE_ENV');
        debug(`ConfigurationManager initialized in ${currentEnv} environment`);
    }

    /**
     * Singleton instance retriever.
     * @returns The singleton instance of ConfigurationManager.
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
            debug('ConfigurationManager instance created');
        }
        return ConfigurationManager.instance;
    }

    /**
     * Retrieves a specific configuration by name.
     * @param configName The name of the configuration to retrieve.
     * @returns The requested configuration or null if not found.
     */
    public getConfig(configName: string): convict.Config<any> | null {
        const config = this.configs[configName];
        if (config) {
            debug(`Configuration '${configName}' retrieved successfully`);
        } else {
            debug(`Configuration '${configName}' not found`);
        }
        return config || null;
    }

    /**
     * Stores a session ID for a specific integration and channel.
     * @param integration The name of the integration (e.g., 'flowise').
     * @param channelId The ID of the channel or conversation.
     * @param sessionId The session ID to store.
     */
    public setSession(integration: string, channelId: string, sessionId: string) {
        if (!this.sessionStore[integration]) {
            this.sessionStore[integration] = {};
        }
        this.sessionStore[integration][channelId] = sessionId;
        debug(`Session set for integration ${integration}, channel ${channelId}`);
    }

    /**
     * Retrieves a stored session ID for a specific integration and channel.
     * @param integration The name of the integration (e.g., 'flowise').
     * @param channelId The ID of the channel or conversation.
     * @returns The session ID if found, or undefined if not stored.
     */
    public getSession(integration: string, channelId: string): string | undefined {
        return this.sessionStore[integration]?.[channelId];
    }

    /**
     * Retrieves all session IDs for a specific integration.
     * @param integration The name of the integration (e.g., 'flowise').
     * @returns A record of all channel IDs mapped to their session IDs.
     */
    public getAllSessions(integration: string): Record<string, string> | undefined {
        return this.sessionStore[integration];
    }
}
