"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const debug_1 = __importDefault(require("debug"));
const uuid_1 = require("uuid");
const debug = (0, debug_1.default)('app:providerConfigManager');
class ProviderConfigManager {
    constructor() {
        this.store = { message: [], llm: [] };
        this.initialized = false;
        const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
        // Ensure providers directory exists
        const providersDir = path.join(configDir, 'providers');
        if (!fs.existsSync(providersDir)) {
            fs.mkdirSync(providersDir, { recursive: true });
        }
        this.configPath = path.join(providersDir, 'instances.json');
        this.loadConfig();
        // Migration: If empty, try to populate from legacy sources (one-time)
        if (this.store.message.length === 0 && this.store.llm.length === 0) {
            this.migrateLegacyConfigs();
        }
    }
    static getInstance() {
        if (!ProviderConfigManager.instance) {
            ProviderConfigManager.instance = new ProviderConfigManager();
        }
        return ProviderConfigManager.instance;
    }
    /**
     * Interpolate ${ENV_VAR} patterns in config values with actual environment variables
     */
    interpolateEnvVars(obj) {
        if (typeof obj === 'string') {
            return obj.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
                const value = process.env[envVar] || '';
                debug(`Interpolating \${${envVar}} -> "${value}" (env available: ${!!process.env[envVar]})`);
                return value;
            });
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateEnvVars(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const result = {};
            for (const key of Object.keys(obj)) {
                result[key] = this.interpolateEnvVars(obj[key]);
            }
            return result;
        }
        return obj;
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const parsed = JSON.parse(raw);
                // Interpolate ${ENV_VAR} patterns with actual env values
                this.store = this.interpolateEnvVars(parsed);
                debug(`Loaded ${this.store.message.length} message and ${this.store.llm.length} llm providers`);
            }
            else {
                this.store = { message: [], llm: [] };
                this.saveConfig();
            }
            this.initialized = true;
        }
        catch (error) {
            debug('Error loading provider config:', error);
            this.store = { message: [], llm: [] };
        }
    }
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.store, null, 2));
            debug('Saved provider config');
        }
        catch (error) {
            debug('Error saving provider config:', error);
        }
    }
    /**
     * One-time migration from environment variables/legacy configs to instances
     */
    migrateLegacyConfigs() {
        debug('Migrating legacy configs...');
        let changed = false;
        // Discord
        const discordToken = process.env.DISCORD_BOT_TOKEN;
        if (discordToken) {
            const tokens = discordToken.split(',');
            tokens.forEach((token, idx) => {
                if (token.trim()) {
                    this.store.message.push({
                        id: `discord-${idx === 0 ? 'default' : (0, uuid_1.v4)()}`,
                        type: 'discord',
                        category: 'message',
                        name: idx === 0 ? 'Default Discord Bot' : `Discord Bot ${idx + 2}`,
                        enabled: true,
                        config: { token: token.trim() },
                    });
                    changed = true;
                }
            });
        }
        // OpenAI
        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey) {
            this.store.llm.push({
                id: 'openai-default',
                type: 'openai',
                category: 'llm',
                name: 'Default OpenAI',
                enabled: true,
                config: {
                    apiKey: openAiKey,
                    model: process.env.OPENAI_MODEL || 'gpt-4',
                },
            });
            changed = true;
        }
        // Ollama
        const ollamaUrl = process.env.OLLAMA_BASE_URL;
        if (ollamaUrl) {
            this.store.llm.push({
                id: 'ollama-default',
                type: 'ollama',
                category: 'llm',
                name: 'Local Ollama',
                enabled: true,
                config: {
                    baseUrl: ollamaUrl,
                    model: process.env.OLLAMA_MODEL || 'llama2',
                },
            });
            changed = true;
        }
        if (changed) {
            this.saveConfig();
            debug('Migration complete');
        }
    }
    // CRUD Operations
    getAllProviders(category) {
        if (category) {
            return this.store[category];
        }
        return [...this.store.message, ...this.store.llm];
    }
    getProvider(id) {
        return [...this.store.message, ...this.store.llm].find(p => p.id === id);
    }
    createProvider(data) {
        const newInstance = {
            ...data,
            id: (0, uuid_1.v4)(), // Generate ID
        };
        if (newInstance.category === 'message') {
            this.store.message.push(newInstance);
        }
        else {
            this.store.llm.push(newInstance);
        }
        this.saveConfig();
        return newInstance;
    }
    updateProvider(id, updates) {
        let target = this.store.message.find(p => p.id === id);
        if (!target) {
            target = this.store.llm.find(p => p.id === id);
        }
        if (!target) {
            return null;
        }
        // Merge updates
        Object.assign(target, updates);
        // Ensure category/id/type are immutable if needed? For now allow update except ID
        target.id = id;
        this.saveConfig();
        return target;
    }
    deleteProvider(id) {
        const msgIdx = this.store.message.findIndex(p => p.id === id);
        if (msgIdx !== -1) {
            this.store.message.splice(msgIdx, 1);
            this.saveConfig();
            return true;
        }
        const llmIdx = this.store.llm.findIndex(p => p.id === id);
        if (llmIdx !== -1) {
            this.store.llm.splice(llmIdx, 1);
            this.saveConfig();
            return true;
        }
        return false;
    }
}
exports.default = ProviderConfigManager;
