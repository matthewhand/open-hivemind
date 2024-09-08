"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ConfigurationManager_1 = __importDefault(require("@config/ConfigurationManager"));
const configManager = ConfigurationManager_1.default.getInstance();
const n8nConfig = configManager.getConfig('n8nConfig');
if (!(n8nConfig === null || n8nConfig === void 0 ? void 0 : n8nConfig.N8N_API_BASE_URL) || !(n8nConfig === null || n8nConfig === void 0 ? void 0 : n8nConfig.N8N_API_KEY)) {
    throw new Error('n8n configuration is missing or incomplete.');
}
const apiClient = axios_1.default.create({
    baseURL: n8nConfig.N8N_API_BASE_URL,
    headers: {
        'Authorization': `Bearer ${n8nConfig.N8N_API_KEY}`,
    },
});
exports.default = apiClient;
