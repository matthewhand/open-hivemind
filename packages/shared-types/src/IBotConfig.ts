/**
 * Bot configuration interface for adapters.
 * Contains only the fields adapters need to know about.
 */
export interface IBotConfig {
    name: string;
    messageProvider: string;
    llmProvider: string;
    discordBotToken?: string;
    slackBotToken?: string;
    slackAppToken?: string;
    slackSigningSecret?: string;
    mattermostUrl?: string;
    mattermostToken?: string;
    mattermostTeam?: string;
    wakeword?: string;
    personality?: string;
    persona?: string;
    idleResponseEnabled?: boolean;
    idleResponseIntervalMs?: number;
    idleResponseMessage?: string;
}

/**
 * Function type for getting bot configuration.
 */
export type GetBotConfigFn = (botName: string) => IBotConfig | null;
