import convict from 'convict';
declare const discordConfig: convict.Config<{
    DISCORD_BOT_TOKEN: [];
    DISCORD_CLIENT_ID: [];
    DISCORD_GUILD_ID: string;
    DISCORD_AUDIO_FILE_PATH: string;
    DISCORD_WELCOME_MESSAGE: string;
    DISCORD_MESSAGE_HISTORY_LIMIT: number;
    DISCORD_CHANNEL_ID: string;
    DISCORD_DEFAULT_CHANNEL_ID: string;
    DISCORD_CHANNEL_BONUSES: Record<string, number>;
    DISCORD_UNSOLICITED_CHANCE_MODIFIER: number;
    DISCORD_VOICE_CHANNEL_ID: string;
    DISCORD_MAX_MESSAGE_LENGTH: number;
    DISCORD_INTER_PART_DELAY_MS: number;
    DISCORD_TYPING_DELAY_MAX_MS: number;
    DISCORD_PRIORITY_CHANNEL: string;
    DISCORD_PRIORITY_CHANNEL_BONUS: number;
    DISCORD_LOGGING_ENABLED: boolean;
    DISCORD_USERNAME_OVERRIDE: string;
    DISCORD_MESSAGE_PROCESSING_DELAY_MS: number;
}>;
export default discordConfig;
//# sourceMappingURL=discordConfig.d.ts.map