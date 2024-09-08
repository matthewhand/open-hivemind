"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convict_1 = __importDefault(require("convict"));
const n8nConfig = (0, convict_1.default)({
    N8N_API_URL: {
        doc: 'N8N API URL',
        format: String,
        default: 'http://localhost:5678/',
        env: 'N8N_API_URL'
    },
    N8N_API_KEY: {
        doc: 'N8N API Key',
        format: String,
        default: '',
        env: 'N8N_API_KEY'
    }
});
n8nConfig.validate({ allowed: 'strict' });
exports.default = n8nConfig;
