import { getEnvConfig } from '../configUtils';

class DiscordConfig {
    public readonly DISCORD_TOKEN: string = getEnvConfig('DISCORD_TOKEN', 'discord.token', '');
    public readonly DISCORD_CLIENT_ID: string = getEnvConfig('DISCORD_CLIENT_ID', 'discord.clientId', '');
    public readonly DISCORD_GUILD_ID: string = getEnvConfig('DISCORD_GUILD_ID', 'discord.guildId', '');
    public readonly DISCORD_CHANNEL_ID: string = getEnvConfig('DISCORD_CHANNEL_ID', 'discord.channelId', '');
    public readonly DISCORD_BOT_PREFIX: string = getEnvConfig('DISCORD_BOT_PREFIX', 'discord.botPrefix', '!');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'discord.maxMessageLength', 2000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'discord.typingDelayMaxMs', 5000);
    public readonly DISCORD_WELCOME_MESSAGE: string = getEnvConfig('DISCORD_WELCOME_MESSAGE', 'discord.welcomeMessage', 'Welcome to the server!');

    constructor() {
        console.log('DiscordConfig initialized');
    }
}

export default DiscordConfig;
