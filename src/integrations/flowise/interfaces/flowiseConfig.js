"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * flowiseConfig
 *
 * Configuration settings specific to the Flowise integration.
 * This file uses the Convict library to define and validate configuration options.
 *
 * Key Features:
 * - **Default Settings**: Defines default configuration values for Flowise.
 * - **Validation**: Ensures that the environment variables are correctly formatted.
 * - **Extensibility**: Easily extendable to include more Flowise-specific settings.
 */
const convict_1 = __importDefault(require("convict"));
const flowiseConfig = (0, convict_1.default)({
    FLOWISE_API_KEY: {
        doc: 'API key for Flowise integration',
        format: String,
        default: '',
        env: 'FLOWISE_API_KEY',
    },
    FLOWISE_API_URL: {
        doc: 'API URL for Flowise integration',
        format: 'url',
        default: 'https://api.flowise.com',
        env: 'FLOWISE_API_URL',
    }
});
exports.default = flowiseConfig;
