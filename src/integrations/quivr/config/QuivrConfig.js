"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convict_1 = __importDefault(require("convict"));
const quivrConfig = (0, convict_1.default)({
    QUIVR_API_URL: {
        doc: 'Quivr API URL',
        format: String,
        default: 'https://api.quivr.com',
        env: 'QUIVR_API_URL'
    },
    QUIVR_API_KEY: {
        doc: 'Quivr API Key',
        format: String,
        default: '',
        env: 'QUIVR_API_KEY'
    }
});
quivrConfig.validate({ allowed: 'strict' });
exports.default = quivrConfig;
