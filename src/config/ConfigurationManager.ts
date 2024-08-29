import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import { getConfigOrWarn } from './getConfigOrWarn';
import { loadIntegrationConfigs } from './loadIntegrationConfigs';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

    // Public properties
    public readonly LLM_PROVIDER: string = getConfigOrWarn('LLM_PROVIDER', 'llm.provider', 'openai');
    public readonly MESSAGE_PROVIDER: string = getConfigOrWarn('MESSAGE_PROVIDER', 'message.provider', 'discord');
    public readonly SERVICE_WEBHOOK_URL: string = getConfigOrWarn('SERVICE_WEBHOOK_URL', 'service.webhook.url', 'https://example.com/webhook');
    public readonly WEBHOOK_URL: string = getConfigOrWarn('WEBHOOK_URL', 'webhook.url', 'https://your-webhook-url');

    // Integration configs
    public readonly integrationConfigs: Record<string, any>;

    private constructor() {
        this.integrationConfigs = loadIntegrationConfigs();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    public getConfig(configName: string): any {
        return this.integrationConfigs[configName];
    }

    public getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
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
