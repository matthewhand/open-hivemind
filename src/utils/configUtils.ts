export function getConfigOrWarn<T>(configKey: string, defaultValue: T): T {
    try {
        const value = config.get<T>(configKey);
        return value;
    } catch (error) {
        logger.warn('Missing mandatory configuration key: ' + configKey);
        return defaultValue;
    }
}
