import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import OpenAIConfig from '@integrations/openai/config/OpenAIConfig';
import DiscordConfig from '@integrations/discord/config/DiscordConfig';
import FlowiseConfig from '@integrations/flowise/config/FlowiseConfig';
import ReplicateConfig from '@integrations/replicate/config/ReplicateConfig';
import N8NConfig from '@integrations/n8n/config/N8NConfig';
import PerplexityConfig from '@integrations/perplexity/config/PerplexityConfig';
import { getConfigOrWarn } from './getConfigOrWarn';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

    public readonly LLM_PROVIDER: string = getConfigOrWarn('LLM_PROVIDER', 'llm.provider', 'openai');
    public readonly MESSAGE_PROVIDER: string = getConfigOrWarn('MESSAGE_PROVIDER', 'message.provider', 'discord');
    public readonly SERVICE_WEBHOOK_URL: string = getConfigOrWarn('SERVICE_WEBHOOK_URL', 'service.webhook.url', 'https://example.com/webhook');

    public readonly openaiConfig: OpenAIConfig;
    public readonly discordConfig: DiscordConfig;
    public readonly flowiseConfig: FlowiseConfig;
    public readonly replicateConfig: ReplicateConfig;
    public readonly n8nConfig: N8NConfig;
    public readonly perplexityConfig: PerplexityConfig;

    private constructor() {
        this.openaiConfig = new OpenAIConfig();
        this.discordConfig = new DiscordConfig();
        this.flowiseConfig = new FlowiseConfig();
        this.replicateConfig = new ReplicateConfig();
        this.n8nConfig = new N8NConfig();
        this.perplexityConfig = new PerplexityConfig();
    }

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
