import convict from 'convict';

// Add custom format for channel bonuses
convict.addFormat({
    name: 'channel-bonuses',
    validate: (val) => {
        if (typeof val !== 'string' && typeof val !== 'object' && val !== undefined) {
            throw new Error('Invalid bonuses: must be a string, object, or undefined.');
        }
    },
    coerce: (val) => {
        if (typeof val === 'object') return val;  // Already an object, return as-is
        if (!val) return {};  // If undefined, return an empty object

        return val.split(',').reduce((acc: Record<string, number>, kvp: string) => {
            const [channelId, bonus] = kvp.split(':');
            if (channelId && bonus) {
                acc[channelId] = parseFloat(bonus);
            }
            return acc;
        }, {});
    },
});

// Define the schema for Discord-specific configuration
const discordConfig = convict({
    DISCORD_BOT_TOKEN: {
        doc: 'The token for the Discord bot.',
        format: String,
        default: '',
        env: 'DISCORD_BOT_TOKEN',
    },
    DISCORD_CLIENT_ID: {
        doc: 'The client ID of the Discord bot.',
        format: String,
        default: '',
        env: 'DISCORD_CLIENT_ID',
    },
    DISCORD_GUILD_ID: {
        doc: 'The Discord guild (server) ID.',
        format: String,
        default: '',
        env: 'DISCORD_GUILD_ID',
    },
    DISCORD_AUDIO_FILE_PATH: {
        doc: 'The path to audio files for Discord commands.',
        format: String,
        default: 'audio.wav',
        env: 'DISCORD_AUDIO_FILE_PATH',
    },
    DISCORD_WELCOME_MESSAGE: {
        doc: 'The welcome message for new users.',
        format: String,
        default: 'Welcome to the server!',
        env: 'DISCORD_WELCOME_MESSAGE',
    },
    DISCORD_MESSAGE_HISTORY_LIMIT: {
        doc: 'The number of messages to keep in history.',
        format: 'int',
        default: 10,
        env: 'DISCORD_MESSAGE_HISTORY_LIMIT',
    },
    DISCORD_CHANNEL_ID: {
        doc: 'Default channel ID for outgoing messages.',
        format: String,
        default: '',
        env: 'DISCORD_CHANNEL_ID',
    },
    DISCORD_CHANNEL_BONUSES: {
        doc: 'Optional channel-specific bonuses as a KVP list.',
        format: 'channel-bonuses',
        default: {} as Record<string, number>,  // Explicit type declaration
        env: 'DISCORD_CHANNEL_BONUSES',
    },
    DISCORD_UNSOLICITED_CHANCE_MODIFIER: {
        doc: 'Global unsolicited chance modifier.',
        format: Number,
        default: 1.0,
        env: 'DISCORD_UNSOLICITED_CHANCE_MODIFIER',
    },
    DISCORD_VOICE_CHANNEL_ID: {
        doc: 'Optional voice channel ID for voice interactions.',
        format: String,
        default: '',
        env: 'DISCORD_VOICE_CHANNEL_ID',
    },
    DISCORD_MAX_MESSAGE_LENGTH: {
        doc: 'Maximum length of messages sent by the bot.',
        format: 'int',
        default: 2000,
        env: 'DISCORD_MAX_MESSAGE_LENGTH',
    },
    DISCORD_INTER_PART_DELAY_MS: {
        doc: 'Delay in milliseconds between multipart messages.',
        format: 'int',
        default: 500,
        env: 'DISCORD_INTER_PART_DELAY_MS',
    },
    DISCORD_TYPING_DELAY_MAX_MS: {
        doc: 'Maximum delay in milliseconds to simulate typing.',
        format: 'int',
        default: 3000,
        env: 'DISCORD_TYPING_DELAY_MAX_MS',
    },
    DISCORD_PRIORITY_CHANNEL: {
        doc: 'The ID of the priority channel.',
        format: String,
        default: '',
        env: 'DISCORD_PRIORITY_CHANNEL',
    },
    DISCORD_PRIORITY_CHANNEL_BONUS: {
        doc: 'Bonus chance for messages in the priority channel.',
        format: Number,
        default: 1.1,
        env: 'DISCORD_PRIORITY_CHANNEL_BONUS',
    }
});

// Load configuration from JSON file
discordConfig.loadFile('config/providers/discord.json');

// Validate the configuration to ensure it matches the schema
discordConfig.validate({ allowed: 'strict' });

export default discordConfig;
