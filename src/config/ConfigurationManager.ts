import convict from 'convict';
import Debug from 'debug';
import { loadIntegrationConfigs } from './loadIntegrationConfigs';
import messageConfig from '@src/message/interfaces/messageConfig';

const debug = Debug('app:ConfigurationManager');

// Define the convict schema for base configurations
const schema = convict({
    NODE_ENV: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
    },
    // Additional global configurations can be defined here
});

/**
 * ConfigurationManager Class
 * 
 * This singleton class is responsible for managing the application's configurations and sessions.
 * 
 * Key Features:
 * - **Dynamic Configuration Loading**: Configurations are dynamically loaded from integration-specific modules, 
 *   allowing for the seamless addition of new integrations without modifying the core codebase. This makes the 
 *   system highly modular and scalable.
 * 
 * - **Session Management**: Manages sessions for various integrations (e.g., Flowise, OpenAI) in a centralized way.
 * 
 * - **Error Handling**: The class includes mechanisms to validate and handle errors in configurations, providing 
 *   detailed logs when configurations fail to load or are missing.
 * 
 * Usage:
 * - Retrieve configurations by name using `getConfig(configName: string)`.
 * - Ensure configurations are loaded at the start using `loadConfig()` method.
 * - Use `setSession` and `getSession` for integration session management.
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager; // Singleton instance
    private configs: Record<string, convict.Config<any>> | null = null; // Stores integration configurations
    private config: Record<string, any> = {};  // Generic config store for sessions per integration and channel

    /**
     * Private constructor to enforce singleton pattern.
     * Initializes the base configurations and logs the current environment.
     */
    private constructor() {
        // Validate and load base configuration using convict schema
        schema.validate({ allowed: 'strict' });

        // Debug the current environment setting
        const currentEnv = schema.get('NODE_ENV');
        debug(`ConfigurationManager initialized in ${currentEnv} environment`);
        this.loadConfig();
    }

    /**
     * Retrieves the singleton instance of ConfigurationManager.
     * If the instance does not exist, it is created.
     *
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
     * Loads the integration-specific configurations.
     * This method should be called only once to initialize the configurations.
     * 
     * Guards against re-loading if configurations are already loaded.
     */
    public loadConfig(): void {
        if (this.configs) {
            debug('Configurations already loaded, skipping reload.');
            return;
        }

        // Load configurations from integrations
        this.configs = loadIntegrationConfigs();

        // Add specific configurations
        this.configs['message'] = messageConfig;

        // Debugging: List all loaded configuration keys
        if (this.configs) {
            const loadedConfigs = Object.keys(this.configs);
            debug(`Loaded configurations: ${loadedConfigs.join(', ')}`);
        } else {
            debug('No configurations were loaded.');
        }

        debug('Integration configurations loaded successfully');
    }

    /**
     * Retrieves a specific configuration by name.
     *
     * @param configName - The name of the configuration to retrieve.
     * @returns The requested configuration or null if not found.
     */
    public getConfig(configName: string): convict.Config<any> | null {
        if (!this.configs) {
            debug(`Attempted to access config '${configName}' before configurations were loaded`);
            return null;
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
     * Stores a session ID for a specific integration and channel.
     * This method is designed to be integration-agnostic, meaning it can store session information for
     * various systems (e.g., Flowise, OpenAI, etc.).
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @param channelId - The ID of the channel or conversation
     * @param sessionId - The session ID to store
     */
    public setSession(integration: string, channelId: string, sessionId: string) {
        if (!this.config[integration]) {
            this.config[integration] = {};
        }
        this.config[integration][channelId] = sessionId;
    }

    /**
     * Retrieves a stored session ID for a specific integration and channel.
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @param channelId - The ID of the channel or conversation
     * @returns The session ID if found, or undefined if not stored
     */
    public getSession(integration: string, channelId: string): string | undefined {
        return this.config[integration]?.[channelId];
    }

    /**
     * Retrieves all session IDs for a specific integration.
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @returns A record of all channel IDs mapped to their session IDs
     */
    public getAllSessions(integration: string): Record<string, string> | undefined {
        return this.config[integration];
    }
}
