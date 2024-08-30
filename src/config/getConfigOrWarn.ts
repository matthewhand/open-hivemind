import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

/**
 * Retrieves the configuration value for a given key, or returns a default value with a warning.
 * This function now delegates to `getEnvConfig` in `ConfigurationManager` to ensure consistent handling.
 * 
 * @param envVar - The environment variable name to look up.
 * @param configKey - The key to look up in the configuration file if the environment variable is not set.
 * @param defaultValue - The default value to return if neither the environment variable nor the config key is found.
 * @returns The configuration value or the default value.
 */
export function getConfigOrWarn<T>(envVar: string, configKey: string, defaultValue: T): T {
    return configManager.getEnvConfig(envVar, configKey, defaultValue);
}
