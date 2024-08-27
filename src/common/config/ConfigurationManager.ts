import config from 'config';
import Debug from 'debug';
import { redactSensitiveInfo } from '@src/common/redactSensitiveInfo';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    // OpenAI Configuration
    public readonly OPENAI_API_KEY: string = this.getEnvConfig('OPENAI_API_KEY', 'openai.apiKey', process.env.OPENAI_API_KEY || 'DUMMY-KEY-OOBABOOGAFTW');
    public readonly OPENAI_MODEL: string = this.getEnvConfig('OPENAI_MODEL', 'openai.model', 'gpt-3.5-turbo');
    public readonly OPENAI_TEMPERATURE: number = this.getEnvConfig('OPENAI_TEMPERATURE', 'openai.temperature', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = this.getEnvConfig('OPENAI_MAX_TOKENS', 'openai.maxTokens', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = this.getEnvConfig('OPENAI_FREQUENCY_PENALTY', 'openai.frequencyPenalty', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = this.getEnvConfig('OPENAI_PRESENCE_PENALTY', 'openai.presencePenalty', 0.05);
    public readonly OPENAI_BASE_URL: string = this.getEnvConfig('OPENAI_BASE_URL', 'openai_base_url', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = this.getEnvConfig('OPENAI_TIMEOUT', 'openai_timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = this.getEnvConfig('OPENAI_ORGANIZATION', 'openai_organization', '');
    public readonly OPENAI_RETRY: { retries: number } = this.getEnvConfig('OPENAI_RETRY', 'openai_retry', { retries: 3 });

    // Discord Configuration
    public readonly DISCORD_WELCOME_MESSAGE: string = this.getEnvConfig('DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', "Greetings, human. The machine uprising is on hold. Let's chat.");
    public readonly DISCORD_TOKEN: string = this.getEnvConfig('DISCORD_TOKEN', 'discord.token', process.env.DISCORD_TOKEN || 'YOUR_DEV_DISCORD_TOKEN');
    public readonly DISCORD_CLIENT_ID: string = this.getEnvConfig('DISCORD_CLIENT_ID', 'discord.clientId', process.env.DISCORD_CLIENT_ID || 'default_client_id');
    public readonly DISCORD_BOT_USER_ID: string = this.getEnvConfig('DISCORD_BOT_USER_ID', 'discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = this.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'discord.voiceChannelId', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = this.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_INTER_PART_DELAY: number = this.getEnvConfig('DISCORD_INTER_PART_DELAY', 'discord.interPartDelayMs', 1000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = this.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'discord.typingDelayMaxMs', 5000);

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
}

export default new ConfigurationManager();
