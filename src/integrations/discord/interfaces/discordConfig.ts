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
    },
    DISCORD_WELCOME_MESSAGE: {
        doc: 'Default welcome message for new users',
        format: String,
        default: 'Welcome to the server!',
        env: 'DISCORD_WELCOME_MESSAGE',
    },
    DISCORD_MESSAGE_HISTORY_LIMIT: {
        doc: 'Limit on the number of messages to fetch from a channel',
        format: 'int',
        default: 10,
        env: 'DISCORD_MESSAGE_HISTORY_LIMIT',
    },
    DISCORD_CHAT_CHANNEL_ID: {
        doc: 'Discord chat channel ID',
        format: String,
        default: '',
        env: 'DISCORD_CHAT_CHANNEL_ID',
    }
});

discordConfig.validate({ allowed: 'strict' });

export default discordConfig;
