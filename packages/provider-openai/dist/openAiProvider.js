"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAiProvider = exports.OpenAiProvider = void 0;
const openai_1 = require("openai");
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const debug_1 = __importDefault(require("debug"));
const errorClasses_1 = require("@src/types/errorClasses");
const debug = (0, debug_1.default)('app:openAiProvider');
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class OpenAiProvider {
    constructor(config) {
        this.name = 'openai';
        this.config = config || {};
    }
    supportsChatCompletion() {
        return true;
    }
    supportsCompletion() {
        return true;
    }
    async generateChatCompletion(userMessage, historyMessages, metadata) {
        var _a, _b;
        debug('Starting chat completion generation');
        // Load configuration - prioritize env vars for critical settings
        debug('this.config:', JSON.stringify(this.config, null, 2));
        debug('process.env.OPENAI_MODEL:', process.env.OPENAI_MODEL);
        const apiKey = this.config.apiKey || openaiConfig_1.default.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
        let baseURL = this.config.baseUrl || openaiConfig_1.default.get('OPENAI_BASE_URL') || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
        const timeout = this.config.timeout || openaiConfig_1.default.get('OPENAI_TIMEOUT') || 10000;
        const organization = this.config.organization || openaiConfig_1.default.get('OPENAI_ORGANIZATION') || undefined;
        const model = (metadata === null || metadata === void 0 ? void 0 : metadata.modelOverride) ||
            (metadata === null || metadata === void 0 ? void 0 : metadata.model) ||
            this.config.model ||
            process.env.OPENAI_MODEL ||
            openaiConfig_1.default.get('OPENAI_MODEL') ||
            'gpt-4o';
        const systemPrompt = (metadata === null || metadata === void 0 ? void 0 : metadata.systemPrompt) || this.config.systemPrompt || openaiConfig_1.default.get('OPENAI_SYSTEM_PROMPT') || 'You are a helpful assistant.';
        debug('OpenAI Config:', {
            baseURL,
            model,
            apiKeyPresent: !!apiKey,
            organization,
            systemPrompt,
        });
        if (!apiKey) {
            throw new errorClasses_1.ConfigurationError('OpenAI API key is missing', 'OPENAI_API_KEY_MISSING');
        }
        // Validate baseURL
        try {
            new URL(baseURL);
        }
        catch (_c) {
            baseURL = DEFAULT_BASE_URL;
        }
        const openai = new openai_1.OpenAI({ apiKey, baseURL, timeout, organization });
        const messages = [
            { role: 'system', content: systemPrompt },
            ...historyMessages.map(msg => ({
                role: msg.role,
                content: msg.getText() || '',
            })),
            { role: 'user', content: userMessage },
        ];
        // Retry loop
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Apply temperature boost from metadata if present (for duplicate retries)
                const baseTemperature = this.config.temperature || openaiConfig_1.default.get('OPENAI_TEMPERATURE') || 0.7;
                const temperatureBoost = (metadata === null || metadata === void 0 ? void 0 : metadata.temperatureBoost) || 0;
                const effectiveTemperature = Math.min(1.5, baseTemperature + temperatureBoost); // Cap at 1.5
                if (temperatureBoost > 0) {
                    debug(`Applying temperature boost: ${baseTemperature} + ${temperatureBoost} = ${effectiveTemperature}`);
                }
                // Apply max tokens override from metadata (for spam prevention)
                const maxTokens = (metadata === null || metadata === void 0 ? void 0 : metadata.maxTokensOverride) || this.config.maxTokens || openaiConfig_1.default.get('OPENAI_MAX_TOKENS') || 150;
                const response = await openai.chat.completions.create({
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature: effectiveTemperature,
                });
                debug('OpenAI Response:', JSON.stringify(response, null, 2));
                const content = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                if (!content) {
                    debug('LLM returned empty content, failing silently');
                    return '';
                }
                return content;
            }
            catch (error) {
                this.handleError(error, attempt);
                if (attempt < MAX_RETRIES) {
                    await delay(RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1));
                    continue;
                }
                throw error;
            }
        }
        return 'An unexpected error occurred.';
    }
    async generateCompletion(prompt) {
        var _a;
        const apiKey = this.config.apiKey || openaiConfig_1.default.get('OPENAI_API_KEY');
        let baseURL = this.config.baseUrl || openaiConfig_1.default.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL;
        const model = this.config.model || openaiConfig_1.default.get('OPENAI_MODEL') || 'gpt-4o'; // Text models like gpt-3.5-turbo-instruct?
        const openai = new openai_1.OpenAI({ apiKey, baseURL });
        // Simplification: Not full logic recreation for brevity as this path is rarely used
        // But maintaining minimal functionality
        try {
            const response = await openai.completions.create({
                model,
                prompt,
                max_tokens: 150,
            });
            return ((_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.text) || '';
        }
        catch (e) {
            console.error(e);
            return '';
        }
    }
    handleError(error, attempt) {
        debug(`Attempt ${attempt} failed: ${error}`);
    }
}
exports.OpenAiProvider = OpenAiProvider;
// Export default singleton for backward compat imports
exports.openAiProvider = new OpenAiProvider();
