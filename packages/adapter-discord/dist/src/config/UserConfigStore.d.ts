import type { BotOverride } from '@src/types/config';
interface ToolConfig {
    guards?: {
        ownerOnly?: boolean;
        allowedUsers?: string[];
    };
}
interface GeneralSettings {
    [key: string]: any;
}
export declare class UserConfigStore {
    private static instance;
    private config;
    private configPath;
    private constructor();
    static getInstance(): UserConfigStore;
    private loadConfig;
    /**
     * Save the current configuration to disk.
     */
    saveConfig(): Promise<void>;
    /**
     * Check if a bot is disabled.
     * @param botName The name of the bot.
     * @returns true if bot is disabled, false otherwise.
     */
    isBotDisabled(botName: string): boolean;
    /**
     * Set bot disabled state and persist to config file.
     * @param botName The name of the bot.
     * @param disabled Whether the bot should be disabled.
     */
    setBotDisabled(botName: string, disabled: boolean): Promise<void>;
    /**
     * Get all disabled bot names.
     * @returns Array of disabled bot names.
     */
    getDisabledBots(): string[];
    getToolConfig(toolName: string): ToolConfig | undefined;
    setToolConfig(toolName: string, config: ToolConfig): void;
    /**
     * Get user overrides for a specific bot.
     * @param botName The name of the bot.
     * @returns A BotOverride object if found, otherwise undefined.
     */
    getBotOverride(botName: string): BotOverride | undefined;
    /**
     * Set user overrides for a specific bot.
     * @param botName The name of the bot.
     * @param overrides The overrides to apply.
     */
    setBotOverride(botName: string, overrides: BotOverride): void;
    /**
     * Get general settings.
     * @returns The general settings object.
     */
    getGeneralSettings(): GeneralSettings;
    /**
     * Set general settings and persist to config file.
     * @param settings The settings to merge/save.
     */
    setGeneralSettings(settings: GeneralSettings): Promise<void>;
}
export {};
//# sourceMappingURL=UserConfigStore.d.ts.map