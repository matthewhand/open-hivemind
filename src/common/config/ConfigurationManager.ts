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
    public readonly OPENAI_BASE_URL: string = this.getEnvConfig('OPENAI_BASE_URL', 'openai_base_url', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = this.getEnvConfig('OPENAI_TIMEOUT', 'openai_timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = this.getEnvConfig('OPENAI_ORGANIZATION', 'openai_organization', '');
    public readonly OPENAI_RETRY: { retries: number } = this.getEnvConfig('OPENAI_RETRY', 'openai_retry', { retries: 3 });

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
    public readonly DISCORD_DISCORD_BOT_USER_ID: string = this.getEnvConfig('DISCORD_DISCORD_BOT_USER_ID', 'discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = this.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'discord.voiceChannelId', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = this.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_INTER_PART_DELAY: number = this.getEnvConfig('DISCORD_INTER_PART_DELAY', 'discord.interPartDelayMs', 1000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = this.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'discord.typingDelayMaxMs', 5000);
    public readonly DISCORD_DISCORD_WELCOME_MESSAGE: string = this.getEnvConfig('DISCORD_DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', 'Welcome to the server!');
    public readonly DISCORD_CHANNEL_ID: string = this.getEnvConfig('DISCORD_CHANNEL_ID', 'discord.channelId', 'default_channel_id');

    // Replicate Configuration
    public readonly REPLICATE_API_TOKEN: string = this.getEnvConfig('REPLICATE_API_TOKEN', 'replicate.apiToken', 'default_replicate_api_token');
    public readonly REPLICATE_API_URL: string = this.getEnvConfig('REPLICATE_API_URL', 'replicate.apiUrl', 'https://api.replicate.com/v1');
    public readonly REPLICATE_MODEL_VERSION: string = this.getEnvConfig('REPLICATE_MODEL_VERSION', 'replicate.modelVersion', 'default_version');
    public readonly REPLICATE_WEBHOOK_URL: string = this.getEnvConfig('REPLICATE_WEBHOOK_URL', 'replicate.webhookUrl', 'https://example.com/webhook');

    // Perplexity Configuration
    public readonly PERPLEXITY_API_URL: string = this.getEnvConfig('PERPLEXITY_API_URL', 'perplexity.apiUrl', 'https://api.perplexity.ai/v1');
    public readonly PERPLEXITY_API_TOKEN: string = this.getEnvConfig('PERPLEXITY_API_TOKEN', 'perplexity.apiToken', 'your-perplexity-api-token-here');

    // Message Configuration
    public readonly MESSAGE_FOLLOW_UP_ENABLED: boolean = this.getEnvConfig('MESSAGE_FOLLOW_UP_ENABLED', 'followUp.enabled', false);
    public readonly MESSAGE_MIN_INTERVAL_MS: number = this.getEnvConfig('MESSAGE_MIN_INTERVAL_MS', 'message.minMessageIntervalMs', 1000);

    // Generic method to retrieve the value from environment, config, or default
    private getEnvConfig<T>(envVar: string, configKey: string, defaultValue: T): T {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            if (typeof defaultValue === 'boolean') {
                return (envValue.toLowerCase() === 'true') as unknown as T;
            } else if (typeof defaultValue === 'number') {
                const parsedValue = parseFloat(envValue);
                return (isNaN(parsedValue) ? defaultValue : parsedValue) as unknown as T;
            }
            return envValue as unknown as T;
        }
    
        const configValue = config.get<T>(configKey);
        return configValue !== undefined ? configValue : defaultValue;
    }
    
    // Generic getConfig method with redaction
    public getConfig<T>(key: string, defaultValue: T): T {
        try {
            const value = config.get<T>(key);
            debug(redactSensitiveInfo(key, value));
            return value !== undefined ? value : defaultValue;
        } catch (error) {
            debug(redactSensitiveInfo(key, defaultValue));
            return defaultValue;
        }
    }
}

export default new ConfigurationManager();
