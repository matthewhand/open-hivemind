"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserConfigStore = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class UserConfigStore {
    constructor() {
        this.config = {};
        this.configPath = path_1.default.join(process.cwd(), 'config', 'user-config.json');
        // Load config synchronously for now to avoid async issues in constructor
        try {
            const data = require('fs').readFileSync(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
        }
        catch (error) {
            // If config file doesn't exist, use default empty config
            this.config = {
                toolSettings: {},
                bots: [],
                botDisabledStates: {},
            };
        }
    }
    static getInstance() {
        if (!UserConfigStore.instance) {
            UserConfigStore.instance = new UserConfigStore();
        }
        return UserConfigStore.instance;
    }
    async loadConfig() {
        try {
            const data = await fs_1.promises.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
        }
        catch (error) {
            // If config file doesn't exist, use default empty config
            this.config = {
                toolSettings: {},
                bots: [],
                botDisabledStates: {},
            };
        }
    }
    /**
     * Save the current configuration to disk.
     */
    async saveConfig() {
        try {
            const configDir = path_1.default.dirname(this.configPath);
            // Ensure directory exists
            await fs_1.promises.mkdir(configDir, { recursive: true });
            await fs_1.promises.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save user config:', error);
            throw error;
        }
    }
    /**
     * Check if a bot is disabled.
     * @param botName The name of the bot.
     * @returns true if bot is disabled, false otherwise.
     */
    isBotDisabled(botName) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.config.botDisabledStates) === null || _a === void 0 ? void 0 : _a[botName]) === null || _b === void 0 ? void 0 : _b.disabled) !== null && _c !== void 0 ? _c : false;
    }
    /**
     * Set bot disabled state and persist to config file.
     * @param botName The name of the bot.
     * @param disabled Whether the bot should be disabled.
     */
    async setBotDisabled(botName, disabled) {
        if (!this.config.botDisabledStates) {
            this.config.botDisabledStates = {};
        }
        this.config.botDisabledStates[botName] = {
            disabled,
            disabledAt: disabled ? new Date().toISOString() : undefined,
        };
        await this.saveConfig();
    }
    /**
     * Get all disabled bot names.
     * @returns Array of disabled bot names.
     */
    getDisabledBots() {
        if (!this.config.botDisabledStates) {
            return [];
        }
        return Object.entries(this.config.botDisabledStates)
            .filter(([_, state]) => state.disabled)
            .map(([name]) => name);
    }
    getToolConfig(toolName) {
        var _a;
        return (_a = this.config.toolSettings) === null || _a === void 0 ? void 0 : _a[toolName];
    }
    setToolConfig(toolName, config) {
        if (!this.config.toolSettings) {
            this.config.toolSettings = {};
        }
        this.config.toolSettings[toolName] = config;
    }
    /**
     * Get user overrides for a specific bot.
     * @param botName The name of the bot.
     * @returns A BotOverride object if found, otherwise undefined.
     */
    getBotOverride(botName) {
        if (!this.config.bots) {
            return undefined;
        }
        const botConfig = this.config.bots.find(bot => bot.name === botName);
        if (!botConfig) {
            return undefined;
        }
        // Map BotConfiguration to BotOverride
        return {
            disabled: this.isBotDisabled(botName),
            messageProvider: botConfig.messageProvider,
            llmProvider: botConfig.llmProvider,
            llmProfile: botConfig.llmProfile,
            responseProfile: botConfig.responseProfile,
            persona: botConfig.persona,
            systemInstruction: botConfig.systemInstruction,
            mcpServers: botConfig.mcpServers,
            mcpGuard: botConfig.mcpGuard,
            mcpGuardProfile: botConfig.mcpGuardProfile,
        };
    }
    /**
     * Set user overrides for a specific bot.
     * @param botName The name of the bot.
     * @param overrides The overrides to apply.
     */
    setBotOverride(botName, overrides) {
        if (!this.config.bots) {
            this.config.bots = [];
        }
        const existingBotIndex = this.config.bots.findIndex(bot => bot.name === botName);
        const botConfig = {
            name: botName,
            messageProvider: overrides.messageProvider || 'discord',
            llmProvider: overrides.llmProvider || 'flowise',
            llmProfile: overrides.llmProfile,
            responseProfile: overrides.responseProfile,
            persona: overrides.persona,
            systemInstruction: overrides.systemInstruction,
            mcpServers: overrides.mcpServers,
            mcpGuard: overrides.mcpGuard,
            mcpGuardProfile: overrides.mcpGuardProfile,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        if (existingBotIndex >= 0) {
            this.config.bots[existingBotIndex] = botConfig;
        }
        else {
            this.config.bots.push(botConfig);
        }
    }
    /**
     * Get general settings.
     * @returns The general settings object.
     */
    getGeneralSettings() {
        return this.config.generalSettings || {};
    }
    /**
     * Set general settings and persist to config file.
     * @param settings The settings to merge/save.
     */
    async setGeneralSettings(settings) {
        if (!this.config.generalSettings) {
            this.config.generalSettings = {};
        }
        // Merge new settings with existing
        this.config.generalSettings = {
            ...this.config.generalSettings,
            ...settings,
        };
        await this.saveConfig();
    }
}
exports.UserConfigStore = UserConfigStore;
