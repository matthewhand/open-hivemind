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
exports.getLlmProvider = getLlmProvider;
const debug_1 = __importDefault(require("debug"));
const provider_openai_1 = require("@hivemind/provider-openai");
const flowiseProvider_1 = require("@integrations/flowise/flowiseProvider");
const openWebUIImport = __importStar(require("@integrations/openwebui/runInference"));
const llmConfig_1 = __importDefault(require("@config/llmConfig"));
const MetricsCollector_1 = require("@src/monitoring/MetricsCollector");
const ProviderConfigManager_1 = __importDefault(require("@src/config/ProviderConfigManager"));
const debug = (0, debug_1.default)('app:getLlmProvider');
function withTokenCounting(provider, instanceId) {
    const metrics = MetricsCollector_1.MetricsCollector.getInstance();
    return {
        name: provider.name,
        supportsChatCompletion: provider.supportsChatCompletion,
        supportsCompletion: provider.supportsCompletion,
        // Add instance ID to provider object if interface allows, to help tracking?
        // For now we map it.
        generateChatCompletion: async (userMessage, historyMessages, metadata) => {
            const response = await provider.generateChatCompletion(userMessage, historyMessages, metadata);
            if (response) {
                metrics.recordLlmTokenUsage(response.length);
            }
            return response;
        },
        generateCompletion: async (userMessage) => {
            const response = await provider.generateCompletion(userMessage);
            if (response) {
                metrics.recordLlmTokenUsage(response.length);
            }
            return response;
        },
    };
}
const openWebUI = {
    name: 'openwebui',
    supportsChatCompletion: () => true,
    supportsCompletion: () => false,
    generateChatCompletion: async (userMessage, historyMessages, metadata) => {
        if (openWebUIImport.generateChatCompletion.length === 3) {
            const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages, metadata);
            return result.text || '';
        }
        else {
            const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
            return result.text || '';
        }
    },
    generateCompletion: async () => {
        throw new Error('Non-chat completion not supported by OpenWebUI');
    },
};
function getLlmProvider() {
    const providerManager = ProviderConfigManager_1.default.getInstance();
    const configuredProviders = providerManager.getAllProviders('llm').filter(p => p.enabled);
    const llmProviders = [];
    if (configuredProviders.length > 0) {
        // New System: Use configured instances
        configuredProviders.forEach(config => {
            try {
                let instance;
                switch (config.type.toLowerCase()) {
                    case 'openai':
                        instance = new provider_openai_1.OpenAiProvider(config.config);
                        debug(`Initialized OpenAI provider instance: ${config.name}`);
                        break;
                    case 'flowise':
                        instance = new flowiseProvider_1.FlowiseProvider(config.config);
                        debug(`Initialized Flowise provider instance: ${config.name}`);
                        break;
                    case 'openwebui':
                        instance = openWebUI; // Singleton/Stateless
                        debug(`Initialized OpenWebUI provider instance: ${config.name}`);
                        break;
                    default:
                        debug(`Unknown LLM provider type: ${config.type}`);
                }
                if (instance) {
                    // We could attach the instance ID to the provider object if we extend the interface
                    // We wrap it to count tokens
                    llmProviders.push(withTokenCounting(instance, config.id));
                }
            }
            catch (error) {
                debug(`Failed to initialize provider ${config.name}: ${error}`);
            }
        });
    }
    if (llmProviders.length === 0) {
        // Fallback: Check Legacy Env Var (LLM_PROVIDER)
        // This is necessary if no migration happened or it failed, or for quick development.
        const rawProvider = llmConfig_1.default.get('LLM_PROVIDER');
        const legacyTypes = (typeof rawProvider === 'string'
            ? rawProvider.split(',').map((v) => v.trim())
            : Array.isArray(rawProvider) ? rawProvider : []);
        if (legacyTypes.length > 0 && legacyTypes[0] !== '') {
            debug(`Fallback to legacy LLM_PROVIDER env var: ${legacyTypes.join(',')}`);
            legacyTypes.forEach(type => {
                let instance;
                switch (type.toLowerCase()) {
                    case 'openai':
                        instance = new provider_openai_1.OpenAiProvider();
                        break;
                    case 'flowise':
                        instance = new flowiseProvider_1.FlowiseProvider();
                        break;
                    case 'openwebui':
                        instance = openWebUI;
                        break;
                }
                if (instance) {
                    llmProviders.push(withTokenCounting(instance, 'legacy'));
                }
            });
        }
    }
    if (llmProviders.length === 0) {
        // If still empty, default to OpenAI (legacy default)
        debug('No providers configured, defaulting to OpenAI (Legacy default)');
        llmProviders.push(withTokenCounting(new provider_openai_1.OpenAiProvider(), 'default'));
    }
    return llmProviders;
}
