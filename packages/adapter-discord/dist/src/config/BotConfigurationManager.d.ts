import type { BotConfig, ConfigurationValidationResult } from '@src/types/config';
export declare class BotConfigurationManager {
    private static instance;
    private bots;
    private legacyMode;
    private warnings;
    private userConfigStore;
    constructor();
    static getInstance(): BotConfigurationManager;
    /**
     * Load configuration from environment variables and config files
     */
    private loadConfiguration;
    /**
     * Auto-discover bot names by scanning environment variables for BOTS_<NAME>_ prefix
     */
    private discoverBotNamesFromEnv;
    /**
     * Load multi-bot configuration from BOTS environment variable
     * (Now deprecated/internal helper for explicit list if needed, but logic is merged above)
     */
    private loadMultiBotConfiguration;
    /**
     * Create individual bot configuration
     */
    private createBotConfig;
    private getEnvVarName;
    private hasEnvOverride;
    private applyUserOverrides;
    private applyLlmProfile;
    private ensureProfileConfig;
    private applyLlmProfileConfig;
    private mergeMissing;
    private normalizeOpenAiProfile;
    private normalizeFlowiseProfile;
    private normalizeOpenWebuiProfile;
    private normalizeOpenSwarmProfile;
    private readString;
    private applyGuardrailProfile;
    private applyMcpServerProfile;
    /**
     * Load legacy configuration for backward compatibility
     */
    private loadLegacyConfiguration;
    /**
     * Detect LLM provider from legacy environment variables
     */
    private detectLegacyLlmProvider;
    /**
     * Check for configuration conflicts and issue warnings
     */
    private validateConfigurationInternal;
    /**
     * Get all configured bots
     */
    getAllBots(): BotConfig[];
    /**
     * Get Discord-specific bot configurations
     */
    getDiscordBotConfigs(): BotConfig[];
    /**
     * Get a specific bot by name
     */
    getBot(name: string): BotConfig | undefined;
    /**
     * Check if running in legacy mode
     */
    isLegacyMode(): boolean;
    /**
     * Get configuration warnings
     */
    getWarnings(): string[];
    addBot(config: BotConfig): Promise<void>;
    /**
     * Update an existing bot configuration
     * For env-var bots, this creates/updates a JSON override file
     */
    updateBot(name: string, updates: Record<string, unknown>): Promise<void>;
    /**
     * Reload configuration
     */
    reload(): void;
    /**
     * Validate configuration
     */
    validateConfiguration(config: unknown): ConfigurationValidationResult;
    /**
     * Merge configurations
     */
    mergeConfigurations(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown>;
    /**
     * Sanitize configuration
     */
    sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown>;
}
export default BotConfigurationManager;
//# sourceMappingURL=BotConfigurationManager.d.ts.map