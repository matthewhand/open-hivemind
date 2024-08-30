import { configManager.getEnvConfig } from '@config/configManager.getEnvConfig';

class discordConfig {
    public readonly DISCORD_TOKEN: string = configManager.getEnvConfig('DISCORD_TOKEN', '');
    public readonly DISCORD_CLIENT_ID: string = configManager.getEnvConfig('DISCORD_CLIENT_ID', '');
    public readonly DISCORD_CHANNEL_ID: string = configManager.getEnvConfig('DISCORD_CHANNEL_ID', 'default_channel_id');
    public readonly DISCORD_BOT_USER_ID: string = configManager.getEnvConfig('DISCORD_BOT_USER_ID', 'default_bot_user_id');
    public readonly DISCORD_VOICE_CHANNEL_ID: string = configManager.getEnvConfig('DISCORD_VOICE_CHANNEL_ID', 'default_voice_channel_id');
    public readonly DISCORD_MAX_MESSAGE_LENGTH: number = configManager.getEnvConfig('DISCORD_MAX_MESSAGE_LENGTH', 2000);
    public readonly DISCORD_INTER_PART_DELAY_MS: number = configManager.getEnvConfig('DISCORD_INTER_PART_DELAY_MS', 1000);
    public readonly DISCORD_TYPING_DELAY_MAX_MS: number = configManager.getEnvConfig('DISCORD_TYPING_DELAY_MAX_MS', 5000);
    public readonly DISCORD_WELCOME_MESSAGE: string = configManager.getEnvConfig('DISCORD_WELCOME_MESSAGE', 'Welcome to the server!');

    constructor() {
        // Validate essential configurations
        if (!this.DISCORD_TOKEN || !this.DISCORD_CLIENT_ID || !this.DISCORD_CHANNEL_ID) {
            throw new Error('Missing critical Discord configuration. Please check your environment variables or config files.');
        }
        console.log('discordConfig initialized');
    }
}

export default discordConfig;
