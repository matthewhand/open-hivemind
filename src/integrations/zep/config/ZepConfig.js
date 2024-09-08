"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convict_1 = __importDefault(require("convict"));
const zepConfig = (0, convict_1.default)({
    ZEP_API_URL: {
        doc: 'Zep API URL',
        format: String,
        default: 'https://api.zep.com',
        env: 'ZEP_API_URL'
    },
    ZEP_API_KEY: {
        doc: 'Zep API Key',
        format: String,
        default: '',
        env: 'ZEP_API_KEY'
    }
});
zepConfig.validate({ allowed: 'strict' });
exports.default = zepConfig;
