"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convict_1 = __importDefault(require("convict"));
const llmConfig = (0, convict_1.default)({
    LLM_PROVIDER: {
        doc: 'LLM provider (e.g., openai, flowise, openwebui)',
        format: String,
        default: 'openai',
        env: 'LLM_PROVIDER',
    },
    LLM_PARALLEL_EXECUTION: {
        doc: 'Whether to allow parallel execution of requests',
        format: Boolean,
        default: false,
        env: 'LLM_PARALLEL_EXECUTION',
        coerce: (val) => {
            if (typeof val === 'boolean') {
                return val;
            }
            if (typeof val === 'string') {
                const lower = val.toLowerCase();
                if (lower === 'true' || lower === '1') {
                    return true;
                }
                if (lower === 'false' || lower === '0') {
                    return false;
                }
            }
            return false;
        },
    },
});
llmConfig.validate({ allowed: 'strict' });
exports.default = llmConfig;
