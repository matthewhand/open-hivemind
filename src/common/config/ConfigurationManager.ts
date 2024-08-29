import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

    public readonly OPENAI_API_KEY: string = this.getEnvConfig('OPENAI_API_KEY', 'openai.apiKey', '');
    public readonly LLM_PROVIDER: string = this.getEnvConfig('LLM_PROVIDER', 'service.LLM_PROVIDER', 'default_provider');
    public readonly DISCORD_TOKEN: string = this.getEnvConfig('DISCORD_TOKEN', 'discord.token', '');

    private constructor() {}

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    private getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            return envValue as unknown as T;
        }
        try {
            const configValue = config.get(configKey);
            if (configValue !== undefined) {
                return configValue as T;
            }
            return fallbackValue;
        } catch (e) {
            debug(`Error fetching CONFIG [${configKey}]. Using fallback value: ${fallbackValue}`);
            return fallbackValue;
        }
    }
}

export default ConfigurationManager;
