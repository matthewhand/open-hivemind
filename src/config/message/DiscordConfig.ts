import ConfigurationManager from '../ConfigurationManager';

class DiscordConfig extends ConfigurationManager {
    public readonly DISCORD_TOKEN: string = this.getEnvConfig('DISCORD_TOKEN', 'discord.token', 'YOUR_DEV_DISCORD_TOKEN');
    public readonly DISCORD_CLIENT_ID: string = this.getEnvConfig('DISCORD_CLIENT_ID', 'discord.clientId', 'default_client_id');
    public readonly DISCORD_CHANNEL_ID: string = this.getEnvConfig('DISCORD_CHANNEL_ID', 'discord.channelId', 'default_channel_id');
    public readonly DISCORD_BOT_USER_ID: string = this.getEnvConfig('DISCORD_BOT_USER_ID', 'discord.botUserId', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = this.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'discord.voiceChannelId', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = this.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = this.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'discord.typingDelayMaxMs', 5000);
    public readonly DISCORD_WELCOME_MESSAGE: string = this.getEnvConfig('DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', 'Welcome to the server!');
}

export default DiscordConfig;
