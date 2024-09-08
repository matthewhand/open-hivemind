"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convict_1 = __importDefault(require("convict"));
const replicateConfig = (0, convict_1.default)({
    REPLICATE_API_URL: {
        doc: 'Replicate API URL',
        format: String,
        default: 'https://api.replicate.com',
        env: 'REPLICATE_API_URL'
    },
    REPLICATE_API_KEY: {
        doc: 'Replicate API Key',
        format: String,
        default: '',
        env: 'REPLICATE_API_KEY'
    },
    REPLICATE_MODEL_VERSION: {
        doc: 'Replicate Model Version',
        format: String,
        default: '',
        env: 'REPLICATE_MODEL_VERSION'
    }
});
replicateConfig.validate({ allowed: 'strict' });
exports.default = replicateConfig;
