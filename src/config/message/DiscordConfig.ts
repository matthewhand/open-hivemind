import ConfigurationManager from '../ConfigurationManager';

class DiscordConfig extends ConfigurationManager {
    public readonly DISCORD_TOKEN: string = this.getEnvConfig('DISCORD_TOKEN', 'discord.token', 'YOUR_DEV_DISCORD_TOKEN');
    public readonly DISCORD_CLIENT_ID: string = this.getEnvConfig('DISCORD_CLIENT_ID', 'discord.clientId', 'default_client_id');
    public readonly DISCORD_CHANNEL_ID: string = this.getEnvConfig('DISCORD_CHANNEL_ID', 'discord.channelId', 'default_channel_id');
    public readonly DISCORD_BOT_USER_ID: string = this.getEnvConfig('DISCORD_BOT_USER_ID', 'discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = this.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'discord.voiceChannelId', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = this.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_WELCOME_MESSAGE: string = this.getEnvConfig('DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', 'Welcome to the server!');

    public readonly followUpHandler = {
        enabled: this.getEnvConfig('DISCORD_FOLLOW_UP_ENABLED', 'message.discord.followUpHandler.enabled', true),
        delayBeforeFollowUpMs: this.getEnvConfig('DISCORD_FOLLOW_UP_DELAY_MS', 'message.discord.followUpHandler.delayBeforeFollowUpMs', 10000)
    };

    public readonly unsolicitedResponseHandler = {
        enabled: this.getEnvConfig('DISCORD_UNSOLICITED_ENABLED', 'message.discord.unsolicitedResponseHandler.enabled', true),
        responseTriggerWords: this.getEnvConfig('DISCORD_UNSOLICITED_TRIGGER_WORDS', 'message.discord.unsolicitedResponseHandler.responseTriggerWords', ['help', 'support']),
        responseRateLimitMs: this.getEnvConfig('DISCORD_UNSOLICITED_RATE_LIMIT_MS', 'message.discord.unsolicitedResponseHandler.responseRateLimitMs', 60000)
    };

    public readonly responseTimingManager = {
        initialDelayMs: this.getEnvConfig('DISCORD_INITIAL_DELAY_MS', 'message.discord.responseTimingManager.initialDelayMs', 500),
        maxDelayMs: this.getEnvConfig('DISCORD_MAX_DELAY_MS', 'message.discord.responseTimingManager.maxDelayMs', 10000),
        minDelayMs: this.getEnvConfig('DISCORD_MIN_DELAY_MS', 'message.discord.responseTimingManager.minDelayMs', 500),
        randomizeDelay: this.getEnvConfig('DISCORD_RANDOMIZE_DELAY', 'message.discord.responseTimingManager.randomizeDelay', true),
        typingDelayMaxMs: this.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'message.discord.responseTimingManager.typingDelayMaxMs', 5000)
    };
}

export default DiscordConfig;
