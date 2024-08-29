import config from 'config';
import Debug from 'debug';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

    private constructor() {
        debug('Loading core configurations...');
        this.loadEnabledIntegrations();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    private loadEnabledIntegrations() {
        const integrations = this.getEnvConfig<any>('INTEGRATIONS', 'commands.integrations', {});
        for (const integration in integrations) {
            if (integrations[integration].enabled) {
                const integrationConfig = this.loadIntegrationConfig(integration);
                config.util.extendDeep(config[integration], integrationConfig);
            }
        }
    }

    private loadIntegrationConfig(integration: string) {
        const configPath = `./integrations/${integration}Config`;
        try {
            const IntegrationConfig = require(configPath).default;
            const integrationInstance = new IntegrationConfig();
            return integrationInstance;
        } catch (error) {
            throw new Error(`Failed to load config for integration: ${integration}. Error: ${error.message}`);
        }
    }

    protected getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            if (typeof fallbackValue === 'boolean') {
                return (envValue.toLowerCase() === 'true') as unknown as T;
            } else if (typeof fallbackValue === 'number') {
                const parsedValue = parseFloat(envValue);
                return isNaN(parsedValue) ? fallbackValue : (parsedValue as unknown as T);
            }
            return envValue as unknown as T;
        }

        try {
            const configValue = config.get(configKey);
            return configValue !== undefined ? (configValue as T) : fallbackValue;
        } catch (e) {
            debug(`Error fetching CONFIG [${configKey}]. Using fallback value: ${fallbackValue}`);
            return fallbackValue;
        }
    }
}

export default ConfigurationManager;
