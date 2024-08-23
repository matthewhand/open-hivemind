import ConfigurationManager from '@src/common/config/ConfigurationManager';

export function getConfigOrWarn<T>(configKey: string, defaultValue: T): T {
    const value = ConfigurationManager.getConfig<T>(configKey, defaultValue);
    if (!value) {
        console.warn('Missing mandatory configuration key: ' + configKey);
    }
    return value;
}
