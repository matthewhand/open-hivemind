/**
 * discordConfig
 * 
 * Configuration settings specific to the Discord integration.
 * This file uses the Convict library to define and validate configuration options.
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
    },
    DISCORD_AUDIO_FILE_PATH: {
        doc: 'Path for storing audio files during voice interactions',
        format: String,
        default: 'audio.wav',
        env: 'DISCORD_AUDIO_FILE_PATH',
    }
});

export default discordConfig;
