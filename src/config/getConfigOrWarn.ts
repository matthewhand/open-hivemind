import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

/**
 * Retrieves the configuration value for a given key, or returns a default value with a warning.
 * @param configKey - The key to look up in the configuration.
 * @param defaultValue - The default value to return if the key is not found.
 * @returns The configuration value or the default value.
 */
export function getConfigOrWarn<T>(configKey: string, defaultValue: T): T {
    const value = configManager[configKey as keyof typeof configManager] as unknown as T;
    if (value === undefined) {
        console.warn(`Configuration key '${configKey}' not found. Using default value: ${defaultValue}`);
        return defaultValue;
    }
    return value;
}
