/**
 * discordConfig
 * 
 * Configuration settings specific to the Discord integration.
 * This file uses the Convict library to define and validate configuration options.
 * 
 * Key Features:
 * - **Default Settings**: Provides default values for Discord-related configurations.
 * - **Validation**: Ensures the environment variables are correctly set.
 * - **Extensibility**: Can be extended to include more Discord-specific settings.
 */
import convict from 'convict';

const discordConfig = convict({
    DISCORD_BOT_TOKEN: {
        doc: 'Bot token for authenticating with Discord',
        format: String,
        default: '',
        env: 'DISCORD_BOT_TOKEN',
    },
    DISCORD_CLIENT_ID: {
        doc: 'Client ID for the Discord bot',
        format: String,
        default: '',
        env: 'DISCORD_CLIENT_ID',
    },
    DISCORD_GUILD_ID: {
        doc: 'Guild ID where the bot is active',
        format: String,
        default: '',
        env: 'DISCORD_GUILD_ID',
    }
});

export default discordConfig;
