import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import OpenAIConfig from './llm/OpenAIConfig';
import DiscordConfig from './message/DiscordConfig';
import FlowiseConfig from './llm/FlowiseConfig';
import N8NConfig from './llm/N8NConfig';
import PerplexityConfig from './llm/PerplexityConfig';
import ReplicateConfig from './commandConfig/ReplicateConfig';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;

    public readonly openaiConfig: OpenAIConfig;
    public readonly discordConfig: DiscordConfig;
    public readonly flowiseConfig: FlowiseConfig;
    public readonly n8nConfig: N8NConfig;
    public readonly perplexityConfig: PerplexityConfig;
    public readonly replicateConfig: ReplicateConfig;

    private constructor() {
        this.openaiConfig = new OpenAIConfig();
        this.discordConfig = new DiscordConfig();
        this.flowiseConfig = new FlowiseConfig();
        this.n8nConfig = new N8NConfig();
        this.perplexityConfig = new PerplexityConfig();
        this.replicateConfig = new ReplicateConfig();
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
