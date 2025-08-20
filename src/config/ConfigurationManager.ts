import convict from 'convict';
import Debug from 'debug';

const debug = Debug('app:ConfigurationManager');

/**
 * Base convict schema for environment configuration
 * @typedef {Object} BaseSchema
 * @property {Object} NODE_ENV - Node environment configuration
 */
const schema = convict({
    NODE_ENV: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
    }
});

/**
 * ConfigurationManager Class - Singleton configuration manager
 *
 * @class
 * @description Centralized configuration management system that handles:
 * - Environment configuration validation
 * - Runtime configuration storage
 * - Session ID management across integrations
 *
 * @example
 * const configManager = ConfigurationManager.getInstance();
 * const envConfig = configManager.getConfig('environment');
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager | null = null;
    private configs: Record<string, convict.Config<any>> = {};
    private sessionStore: Record<string, Record<string, string>> = {};

    /**
     * Private constructor for singleton pattern
     * @private
     * @throws {Error} If schema validation fails
     */
    private constructor() {
        schema.validate({ allowed: 'strict' });
        debug('ConfigurationManager initialized in development environment');
    }

    /**
     * Gets the singleton instance
     * @static
     * @returns {ConfigurationManager} The singleton instance
     * @example
     * const configManager = ConfigurationManager.getInstance();
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
            ConfigurationManager.instance = new ConfigurationManager();
            debug('ConfigurationManager instance created');
        }
        return ConfigurationManager.instance!; // Non-null assertion here
    }

    /**
     * Retrieves a configuration object by name
     * @param {string} configName - Name of the configuration to retrieve
     * @returns {convict.Config<any>|null} Requested configuration or null if not found
     * @throws {TypeError} If configName is not a string
     * @example
     * const dbConfig = configManager.getConfig('database');
     */
    public getConfig(configName: string): convict.Config<any> | null {
        if (typeof configName !== 'string') {
            throw new TypeError('configName must be a string');
        }
        const config = this.configs[configName];
        if (config) {
            debug(`Configuration '${configName}' retrieved successfully`);
        } else {
            debug(`Configuration '${configName}' not found`);
        }
        return config || null;
    }

    /**
     * Stores a unique session ID for an integration/channel combination
     * @param {string} integration - Integration name (e.g., 'slack', 'discord')
     * @param {string} channelId - Channel/conversation identifier
     * @param {string} sessionId - Session identifier to store
     * @returns {void}
     * @throws {TypeError} If any argument is missing or invalid
     * @example
     * configManager.setSession('slack', 'C123456', 'session_789');
     */
    public setSession(integration: string, channelId: string, sessionId: string) {
        if (typeof integration !== 'string') {
            throw new TypeError('integration must be a string');
        }
        if (typeof channelId !== 'string') {
            throw new TypeError('channelId must be a string');
        }
        if (typeof sessionId !== 'string') {
            throw new TypeError('sessionId must be a string');
        }
        if (!this.sessionStore[integration]) {
            this.sessionStore[integration] = {};
        }
        const uniqueSessionId = `${integration}-${channelId}-${sessionId}`;
        this.sessionStore[integration][channelId] = uniqueSessionId;
        debug(`Session set for integration ${integration}, channel ${channelId}, session ${uniqueSessionId}`);
    }

    /**
     * Retrieves a stored session ID
     * @param {string} integration - Integration name
     * @param {string} channelId - Channel/conversation identifier
     * @returns {string|undefined} Session ID if exists, undefined otherwise
     * @throws {TypeError} If arguments are invalid
     * @example
     * const session = configManager.getSession('slack', 'C123456');
     */
    public getSession(integration: string, channelId: string): string | undefined {
        return this.sessionStore[integration]?.[channelId];
    }

    /**
     * Retrieves all sessions for an integration
     * @param {string} integration - Integration name
     * @returns {Record<string, string>|undefined} All channel-session mappings or undefined
     * @throws {TypeError} If integration name is invalid
     * @example
     * const allSessions = configManager.getAllSessions('slack');
     */
    public getAllSessions(integration: string): Record<string, string> | undefined {
        return this.sessionStore[integration];
    }
}
