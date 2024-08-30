import config from 'config';
import Debug from 'debug';
import { getConfigOrWarn } from './getConfigOrWarn';
import { loadIntegrationConfigs } from './loadIntegrationConfigs';
import messageConfig from '@src/message/config/messageConfig';
import LlmConfig from '@src/llm/config/LlmConfig';  // Import the LlmConfig class

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

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
        if (configName === 'message') {
            return new messageConfig();
        }

        if (configName === 'llm') {
            return new LlmConfig();
        }

        // Fallback to integration configs
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
