import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    public readonly LLM_PROVIDER: string = this.getEnvConfig('LLM_PROVIDER', 'llm.provider', 'default_provider');
    public readonly MESSAGE_PROVIDER: string = this.getEnvConfig('MESSAGE_PROVIDER', 'message.provider', 'discord');
    public readonly SERVICE_WEBHOOK_URL: string = this.getEnvConfig('WEBHOOK_URL', 'service.WEBHOOK_URL', '');
    public readonly LOG_LEVEL: string = this.getEnvConfig('LOG_LEVEL', 'service.logLevel', 'debug');
    public readonly RATE_LIMIT_REQUESTS: number = this.getEnvConfig('RATE_LIMIT_REQUESTS', 'service.rateLimitRequests', 1000);
    public readonly RATE_LIMIT_DURATION: number = this.getEnvConfig('RATE_LIMIT_DURATION', 'service.rateLimitDuration', 60);

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
