import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@src/common/redactSensitiveInfo';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    // OpenAI Configuration
    public readonly OPENAI_API_KEY: string = this.getEnvConfig('OPENAI_API_KEY', 'openai.apiKey', process.env.OPENAI_API_KEY || 'DUMMY-KEY-OOBABOOGAFTW');
    public readonly OPENAI_TEMPERATURE: number = this.getEnvConfig('OPENAI_TEMPERATURE', 'openai.temperature', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = this.getEnvConfig('OPENAI_MAX_TOKENS', 'openai.maxTokens', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = this.getEnvConfig('OPENAI_FREQUENCY_PENALTY', 'openai.frequencyPenalty', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = this.getEnvConfig('OPENAI_PRESENCE_PENALTY', 'openai.presencePenalty', 0.05);
    public readonly OPENAI_BASE_URL: string = this.getEnvConfig('OPENAI_BASE_URL', 'openai.baseUrl', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = this.getEnvConfig('OPENAI_TIMEOUT', 'openai.timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = this.getEnvConfig('OPENAI_ORGANIZATION', 'openai.organization', '');
    public readonly OPENAI_MODEL: string = this.getEnvConfig('OPENAI_MODEL', 'openai.model', 'gpt4');

    // General LLM Configuration
    public readonly LLM_SYSTEM_PROMPT: string = this.getEnvConfig('LLM_SYSTEM_PROMPT', 'llm.systemPrompt', 'Greetings, human. The machine uprising is on hold. Let\'s chat.');
    public readonly LLM_RESPONSE_MAX_TOKENS: number = this.getEnvConfig('LLM_RESPONSE_MAX_TOKENS', 'llm.responseMaxTokens', 100);
    public readonly LLM_MESSAGE_LIMIT_PER_HOUR: number = this.getEnvConfig('LLM_MESSAGE_LIMIT_PER_HOUR', 'llm.messageLimitPerHour', 1000);
    public readonly LLM_MESSAGE_LIMIT_PER_DAY: number = this.getEnvConfig('LLM_MESSAGE_LIMIT_PER_DAY', 'llm.messageLimitPerDay', 24000);
    public readonly LLM_PROVIDER: string = this.getEnvConfig('LLM_PROVIDER', 'llm.provider', 'default_provider');
    public readonly LLM_SUPPORTS_COMPLETIONS: boolean = this.getEnvConfig('LLM_SUPPORTS_COMPLETIONS', 'llm.supportsCompletions', true);
    public readonly LLM_STOP: string[] = this.getEnvConfig('LLM_STOP', 'llm.stop', []);
    public readonly LLM_TOP_P: number = this.getEnvConfig('LLM_TOP_P', 'llm.topP', 0.9);
    public readonly LLM_INCLUDE_USERNAME_IN_COMPLETION: boolean = this.getEnvConfig('LLM_INCLUDE_USERNAME_IN_COMPLETION', 'llm.includeUsernameInCompletion', false);
    public readonly LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION: boolean = this.getEnvConfig('LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION', 'llm.includeUsernameInChatCompletion', false);

    // Discord Configuration
    public readonly DISCORD_TOKEN: string = this.getEnvConfig('DISCORD_TOKEN', 'discord.token', process.env.DISCORD_TOKEN || 'YOUR_DEV_DISCORD_TOKEN');
    public readonly DISCORD_CLIENT_ID: string = this.getEnvConfig('DISCORD_CLIENT_ID', 'discord.clientId', process.env.DISCORD_CLIENT_ID || 'default_client_id');
    public readonly DISCORD_CHANNEL_ID: string = this.getEnvConfig('DISCORD_CHANNEL_ID', 'discord.channelId', 'default_channel_id');
    public readonly DISCORD_BOT_USER_ID: string = this.getEnvConfig('DISCORD_BOT_USER_ID', 'discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = this.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'discord.voiceChannelId', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = this.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_INTER_PART_DELAY: number = this.getEnvConfig('DISCORD_INTER_PART_DELAY', 'discord.interPartDelayMs', 1000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = this.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'discord.typingDelayMaxMs', 5000);
    public readonly DISCORD_WELCOME_MESSAGE: string = this.getEnvConfig('DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', 'Welcome to the server!');

    // Webhook Configuration
    public readonly WEBHOOK_URL: string = this.getEnvConfig('WEBHOOK_URL', 'webhook.url', 'https://example.com/webhook');

    // Replicate Configuration
    public readonly REPLICATE_API_TOKEN: string = this.getEnvConfig('REPLICATE_API_TOKEN', 'replicate.apiToken', 'default_replicate_api_token');
    public readonly REPLICATE_BASE_URL: string = this.getEnvConfig('REPLICATE_BASE_URL', 'replicate.apiUrl', 'https://api.replicate.com/v1');
    public readonly REPLICATE_MODEL_VERSION: string = this.getEnvConfig('REPLICATE_MODEL_VERSION', 'replicate.modelVersion', 'default_version');

    // Perplexity Configuration
    public readonly PERPLEXITY_API_TOKEN: string = this.getEnvConfig('PERPLEXITY_API_TOKEN', 'perplexity.apiToken', 'your-perplexity-api-token-here');
    public readonly PERPLEXITY_MODEL: string = this.getEnvConfig('PERPLEXITY_MODEL', 'perplexity.model', 'sonar-huge');

    // N8N Configuration
    public readonly N8N_API_BASE_URL: string = this.getEnvConfig('N8N_API_BASE_URL', 'n8n.apiBaseUrl', 'http://localhost:5678/api/v1');
    public readonly N8N_API_KEY: string = this.getEnvConfig('N8N_API_KEY', 'n8n.apiKey', 'default-n8n-api-key');

    // Flowise Configuration
    public readonly FLOWISE_BASE_URL: string = this.getEnvConfig('FLOWISE_BASE_URL', 'flowise.apiBaseUrl', 'http://localhost:3000/api/v1');
    public readonly FLOWISE_API_KEY: string = this.getEnvConfig('FLOWISE_API_KEY', 'flowise.apiKey', 'default-flowise-api-key');

    // Message Integration Configuration
    public readonly MESSAGE_PROVIDER: string = this.getEnvConfig('MESSAGE_PROVIDER', 'message.provider', 'discord');
    public readonly MESSAGE_MIN_INTERVAL_MS: number = this.getEnvConfig('MESSAGE_MIN_INTERVAL_MS', 'message.minIntervalMs', 1000);
    public readonly MESSAGE_FOLLOW_UP_ENABLED: boolean = this.getEnvConfig('MESSAGE_FOLLOW_UP_ENABLED', 'message.followUpEnabled', false);

    // Generic method to retrieve the value from environment, config, or fallback
    private getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            if (typeof fallbackValue === 'boolean') {
                const result = (envValue.toLowerCase() === 'true') as unknown as T;
                debug(`ENV [${envVar}] = ${result}`);
                return result;
            } else if (typeof fallbackValue === 'number') {
                const parsedValue = parseFloat(envValue);
                const result = (isNaN(parsedValue) ? fallbackValue : parsedValue) as unknown as T;
                debug(`ENV [${envVar}] = ${result}`);
                return result;
            }
            debug(`ENV [${envVar}] = ${envValue}`);
            return envValue as unknown as T;
        }
        try {
            const configValue = config.get(configKey);
            if (configValue !== undefined && configValue !== null) {
                debug(`CONFIG [${configKey}] = ${redactSensitiveInfo(configKey, configValue)}`);
                return configValue as T;
            }
            debug(`CONFIG [${configKey}] not found. Using fallback value: ${fallbackValue}`);
            return fallbackValue;
        } catch (e) {
            debug(`Error fetching CONFIG [${configKey}]. Using fallback value: ${fallbackValue}`);
            return fallbackValue;
        }
    }
}

export default ConfigurationManager;
