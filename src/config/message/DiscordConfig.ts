import { getEnvConfig } from '../configUtils';

class discordConfig {
    public readonly DISCORD_TOKEN: string = getEnvConfig('DISCORD_TOKEN', 'message.discord.token', 'your-discord-token');
    public readonly DISCORD_CLIENT_ID: string = getEnvConfig('DISCORD_CLIENT_ID', 'message.discord.clientId', 'your-discord-client-id');
    public readonly DISCORD_GUILD_ID: string = getEnvConfig('DISCORD_GUILD_ID', 'message.discord.guildId', 'your-discord-guild-id');
    public readonly DISCORD_CHANNEL_ID: string = getEnvConfig('DISCORD_CHANNEL_ID', 'message.discord.channelId', 'your-discord-channel-id');
    public readonly DISCORD_BOT_PREFIX: string = getEnvConfig('DISCORD_BOT_PREFIX', 'message.discord.botPrefix', '!');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 'message.discord.maxMessageLength', 2000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 'message.discord.typingDelayMaxMs', 5000);

    constructor() {
        console.log('DiscordConfig initialized');
    }
}

export default discordConfig;
