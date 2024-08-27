import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@src/common/redactSensitiveInfo';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    public readonly MESSAGE: string = this.getConfig<string>('message.provider', process.env.MESSAGE || 'discord');
    // LLM Configuration
    public readonly LLM_API_KEY: string = this.getConfig<string>('llm.apiKey', process.env.LLM_API_KEY || 'DUMMY-KEY-OOBABOOGAFTW');
    public readonly LLM_SYSTEM_PROMPT: string = this.getConfig<string>('llm.systemPrompt', 'default_system_prompt');
    public readonly LLM_MAX_TOKENS: number = this.getConfig<number>('llm.maxTokens', 150);
    public readonly LLM_RESPONSE_MAX_TOKENS: number = this.getConfig<number>('llm.responseMaxTokens', 100);
    public readonly LLM_TEMPERATURE: number = this.getConfig<number>('llm.temperature', 0.7);
    public readonly OPENAI_MODEL: string = this.getConfig<string>('llm.model', 'default_model');
    public readonly LLM_MESSAGE_LIMIT_PER_HOUR: number = this.getConfig<number>('llm.messageLimitPerHour', 1000);
    public readonly LLM_MESSAGE_LIMIT_PER_DAY: number = this.getConfig<number>('llm.messageLimitPerDay', 24000);
    public readonly LLM_PROVIDER: string = this.getConfig<string>('llm.provider', 'default_provider');
    public readonly LLM_SUPPORTS_COMPLETIONS: boolean = this.getConfig<boolean>('llm.supportsCompletions', true);
    public readonly LLM_STOP: string[] = this.getConfig<string[]>('llm.stop', []);
    public readonly LLM_TOP_P: number = this.getConfig<number>('llm.topP', 0.9);
    public readonly LLM_FREQUENCY_PENALTY: number = this.getConfig<number>('llm.frequencyPenalty', 0.1);
    public readonly LLM_PRESENCE_PENALTY: number = this.getConfig<number>('llm.presencePenalty', 0.05);
    public readonly INCLUDE_USERNAME_IN_COMPLETION: boolean = this.getConfig<boolean>('llm.includeUsernameInCompletion', false);
    public readonly INCLUDE_USERNAME_IN_CHAT_COMPLETION: boolean = this.getConfig<boolean>('llm.includeUsernameInChatCompletion', false);

    // Discord Configuration
    public readonly DISCORD_TOKEN: string = this.getConfig<string>('discord.token', process.env.DISCORD_TOKEN || 'YOUR_DEV_DISCORD_TOKEN');
    public readonly DISCORD_CLIENT_ID: string = this.getConfig<string>('discord.clientId', process.env.DISCORD_CLIENT_ID || 'default_client_id');
    public readonly BOT_USER_ID: string = this.getConfig<string>('discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_DEFAULT_VOICE_CHANNEL_ID: string = this.getConfig<string>('discord.voiceChannelId', 'default_voice_channel_id');
    public readonly MAX_MESSAGE_LENGTH: number = this.getConfig<number>('discord.maxMessageLength', 2000);
    public readonly INTER_PART_DELAY: number = this.getConfig<number>('discord.interPartDelayMs', 1000);
    public readonly BOT_TYPING_DELAY_MAX_MS: number = this.getConfig<number>('discord.typingDelayMaxMs', 5000);
    public readonly WELCOME_MESSAGE: string = this.getConfig<string>('discord.welcomeMessage', process.env.WELCOME_MESSAGE || 'Welcome to the server!');

    // Replicate Configuration
    public readonly REPLICATE_API_TOKEN: string = this.getConfig<string>('replicate.apiToken', 'default_replicate_api_token');
    public readonly REPLICATE_API_URL: string = this.getConfig<string>('replicate.apiUrl', 'https://api.replicate.com/v1');
    public readonly REPLICATE_MODEL_VERSION: string = this.getConfig<string>('replicate.modelVersion', 'default_version');
    public readonly REPLICATE_WEBHOOK_URL: string = this.getConfig<string>('replicate.webhookUrl', 'https://example.com/webhook');

    // Perplexity Configuration
    public readonly PERPLEXITY_API_URL: string = this.getConfig<string>('perplexity.apiUrl', 'https://api.perplexity.ai/v1');

    // Narration Configuration
    public readonly NARRATION_ENDPOINT_URL: string = this.getConfig<string>('narration.endpointUrl', process.env.NARRATION_ENDPOINT_URL || 'https://api.openai.com/v1/audio/translations');
    public readonly NARRATION_API_KEY: string = this.getConfig<string>('narration.apiKey', process.env.NARRATION_API_KEY || 'default_narration_api_key');

    // Transcription Configuration
    public readonly TRANSCRIBE_API_KEY: string = this.getConfig<string>('transcribe.apiKey', process.env.TRANSCRIBE_API_KEY || 'default_transcribe_api_key');

    // Follow-Up Configuration
    public readonly FOLLOW_UP_ENABLED: boolean = this.getConfig<boolean>('followUp.enabled', false);

    // Custom Configurations
    public readonly DISCORD_DEFAULT_CHANNEL_ID: string = this.getConfig<string>('discord.channelId', 'default_channel_id');
    public readonly MIN_MESSAGE_INTERVAL_MS: number = this.getConfig<number>('message.minMessageIntervalMs', 1000);

    // OpenAI Configuration
    public readonly OPENAI_API_KEY: string = this.getConfig<string>('openai_api_key', 'default-api-key');
    public readonly OPENAI_BASE_URL: string = this.getConfig<string>('openai_base_url', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = this.getConfig<number>('openai_timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = this.getConfig<string>('openai_organization', "");
    public readonly OPENAI_RETRY: { retries: number } = this.getConfig<{ retries: number }>('openai_retry', { retries: 3 });

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
