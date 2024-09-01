import convict from 'convict';

const discordConfig = convict({
    DISCORD_TOKEN: {
        doc: 'Discord Bot Token',
        format: String,
        default: '',
        env: 'DISCORD_TOKEN'
    },
    DISCORD_CLIENT_ID: {
        doc: 'Discord Client ID',
        format: String,
        default: '',
        env: 'DISCORD_CLIENT_ID'
    },
    DISCORD_CHAT_CHANNEL_ID: {
        doc: 'Discord Chat Channel ID',
        format: String,
        default: '',
        env: 'DISCORD_CHAT_CHANNEL_ID'
    },
    DISCORD_ADMIN_CHANNEL_ID: {
        doc: 'Discord Admin Channel ID',
        format: String,
        default: '',
        env: 'DISCORD_ADMIN_CHANNEL_ID'
    },
    DISCORD_BOT_USER_ID: {
        doc: 'Discord Bot User ID',
        format: String,
        default: '',
        env: 'DISCORD_BOT_USER_ID'
    },
    DISCORD_VOICE_CHANNEL_ID: {
        doc: 'Discord Voice Channel ID',
        format: String,
        default: '',
        env: 'DISCORD_VOICE_CHANNEL_ID'
    },
    DISCORD_MAX_MESSAGE_LENGTH: {
        doc: 'Maximum Message Length',
        format: Number,
        default: 2000,
        env: 'DISCORD_MAX_MESSAGE_LENGTH'
    },
    DISCORD_INTER_PART_DELAY_MS: {
        doc: 'Inter-part Delay in Milliseconds',
        format: Number,
        default: 1000,
        env: 'DISCORD_INTER_PART_DELAY_MS'
    },
    DISCORD_TYPING_DELAY_MAX_MS: {
        doc: 'Maximum Typing Delay in Milliseconds',
        format: Number,
        default: 5000,
        env: 'DISCORD_TYPING_DELAY_MAX_MS'
    },
    DISCORD_WELCOME_MESSAGE: {
        doc: 'Welcome Message',
        format: String,
        default: 'Welcome to the server!',
        env: 'DISCORD_WELCOME_MESSAGE'
    }
});

discordConfig.validate({ allowed: 'strict' });

export default discordConfig;
