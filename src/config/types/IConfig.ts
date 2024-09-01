/**
 * Interface representing the configuration structure.
 *
 * This interface is designed to provide type safety for accessing configuration values.
 */
export interface IConfig {
    /**
     * Retrieves a configuration value by its key.
     *
     * @param key - The key of the configuration value to retrieve.
     * @returns The configuration value associated with the specified key, or undefined if not found.
     */
    get<T>(key: string): T | undefined;
}
