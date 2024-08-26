import Debug from "debug";
import ConfigurationManager from '@config/ConfigurationManager';

export function getConfigOrWarn<T>(configKey: string, defaultValue: T): T {
    const value = ConfigurationManager.getConfig<T>(configKey, defaultValue);
    if (!value) {
        console.warn('Missing mandatory configuration key: ' + configKey);
    }
    return value;
}
