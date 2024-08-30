import { getConfigOrWarn } from '@config/getConfigOrWarn';

class DiscordConfig {
    public readonly DISCORD_TOKEN: string = getConfigOrWarn('DISCORD_TOKEN', '');
    public readonly DISCORD_CLIENT_ID: string = getConfigOrWarn('DISCORD_CLIENT_ID', '');
    public readonly DISCORD_GUILD_ID: string = getConfigOrWarn('DISCORD_GUILD_ID', '');
    public readonly DISCORD_CHANNEL_ID: string = getConfigOrWarn('DISCORD_CHANNEL_ID', '');
    public readonly DISCORD_BOT_PREFIX: string = getConfigOrWarn('DISCORD_BOT_PREFIX', '!');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = getConfigOrWarn('DISCORD_MAX_MESSAGE_LENGTH', 2000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = getConfigOrWarn('DISCORD_TYPING_DELAY_MAX_MS', 5000);
    public readonly DISCORD_WELCOME_MESSAGE: string = getConfigOrWarn('DISCORD_WELCOME_MESSAGE', 'Welcome to the server!');

    constructor() {
        // Validate essential configurations
        if (!this.DISCORD_TOKEN || !this.DISCORD_CLIENT_ID || !this.DISCORD_CHANNEL_ID) {
            throw new Error('Missing critical Discord configuration. Please check your environment variables or config files.');
        }
        console.log('DiscordConfig initialized');
    }
}

export default DiscordConfig;
