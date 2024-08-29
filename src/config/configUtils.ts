import config from 'config';
import Debug from 'debug';

const debug = Debug('app:configUtils');

export function getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
        // Handle boolean and number parsing
        if (typeof fallbackValue === 'boolean') {
            return (envValue.toLowerCase() === 'true') as unknown as T;
        } else if (typeof fallbackValue === 'number') {
            const parsedValue = parseFloat(envValue);
            return isNaN(parsedValue) ? fallbackValue : (parsedValue as unknown as T);
        }
        return envValue as unknown as T;
    }

    // Fallback to config file or default
    try {
        const configValue = config.get(configKey);
        return configValue !== undefined ? (configValue as T) : fallbackValue;
    } catch (e) {
        debug(`Error fetching CONFIG [${configKey}]. Using fallback value: ${fallbackValue}`);
        return fallbackValue;
    }
}
