import convict from 'convict';
import Debug from 'debug';
import path from 'path';
import fs from 'fs';

const debug = Debug('app:ConfigurationManager');

/**
 * ConfigurationManager Class
 *
 * Manages the loading and retrieval of configurations using the convict library.
 * This class follows the Singleton pattern to ensure only one instance exists.
 * It supports dynamic loading of configurations for various integrations, allowing
 * the application to be easily extended with new services.
 *
 * Key Features:
 * - **Singleton Pattern**: Ensures a single instance of ConfigurationManager is used throughout the application.
 * - **Dynamic Configuration Loading**: Loads configurations from the `config/` directory dynamically.
 * - **Configuration Retrieval**: Provides a method to retrieve configurations by name, with validation and logging.
 *
 * Usage:
 * - Use `getConfig(configName: string)` to retrieve a specific configuration object.
 * - Ensure configurations are loaded before accessing them.
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private configs: Record<string, convict.Config<any>> | null = null;

    // Private constructor to enforce singleton pattern
    private constructor() {}

    /**
     * Retrieves the singleton instance of ConfigurationManager.
     *
     * @returns {ConfigurationManager} The singleton instance.
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    /**
     * Loads configurations from the `config/` directory based on the provided integration names.
     *
     * @param {string[]} integrationNames - The names of the integrations to load configurations for.
     */
    public loadConfigurations(integrationNames: string[]): void {
        this.configs = {};

        integrationNames.forEach((integrationName) => {
            const configFilePath = path.resolve(__dirname, `../integrations/${integrationName}/config/${integrationName}Config.json`);
            if (fs.existsSync(configFilePath)) {
                try {
                    const config = convict(require(configFilePath));
                    config.validate({ allowed: 'strict' });
                    this.configs![integrationName] = config;
                    debug(`Configuration '${integrationName}' loaded successfully.`);
                } catch (error: any) {
                    debug(`Error loading configuration '${integrationName}':`, error);
                }
            } else {
                debug(`Configuration file for '${integrationName}' not found at '${configFilePath}'.`);
            }
        });
    }

    /**
     * Retrieves a configuration by name.
     *
     * @param {string} configName - The name of the configuration to retrieve.
     * @returns {convict.Config<any> | null} The configuration object, or null if not found.
     */
    public getConfig(configName: string): convict.Config<any> | null {
        if (!this.configs) {
            debug('No configurations loaded. Ensure loadConfigurations is called before accessing configurations.');
            return null;
        }

        const config = this.configs[configName];

        if (!config) {
            debug(`Configuration '${configName}' not found.`);
            return null;
        }

        // Debug the structure of the configuration
        debug(`Configuration '${configName}' structure:`, config);

        if (typeof config.get !== 'function') {
            debug(`Invalid configuration: '${configName}' does not have a 'get' method.`);
            return null;
        }

        return config;
    }
}
