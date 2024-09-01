import convict from 'convict';
import Debug from 'debug';
import { loadIntegrationConfigs } from './loadIntegrationConfigs';
import messageConfig from '@src/message/config/messageConfig';
import llmConfig from '@src/llm/config/llmConfig';

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
 * This singleton class is responsible for managing the application's configurations.
 * It loads configurations from integration-specific modules and validates them using convict.
 * The configurations are accessed through the getConfig method.
 */
export default class ConfigurationManager {
    private static instance: ConfigurationManager; // Singleton instance
    private configs: Record<string, convict.Config<any>> | null = null; // Stores integration configurations

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
        this.configs['llm'] = llmConfig;

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
}
