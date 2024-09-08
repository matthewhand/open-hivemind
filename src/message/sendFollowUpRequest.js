"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowUpRequest = sendFollowUpRequest;
const debug_1 = __importDefault(require("debug"));
const openai_1 = __importDefault(require("openai"));
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug = (0, debug_1.default)('app:sendFollowUpRequest');
/**
 * Sends a follow-up request to the OpenAI service using the official client.
 *
 * This function sends a request to the OpenAI API, passing the provided message as input.
 * It uses the configured API key, model, and other settings from convict config.
 *
 * Guards are implemented to handle cases where critical configuration values are missing.
 * Debugging logs are included for better traceability of the request process.
 *
 * @param message - The input message to send to the OpenAI API.
 * @returns {Promise<any>} - The response data from the OpenAI API, or null if an error occurred.
 */
function sendFollowUpRequest(message) {
    return __awaiter(this, void 0, void 0, function* () {
        // Guard: Ensure openaiConfig is loaded
        if (!openaiConfig_1.default) {
            console.error('OpenAI configuration is not loaded.');
            return null;
        }
        // Simplified type assertions
        const API_KEY = openaiConfig_1.default.get('OPENAI_API_KEY');
        const OPENAI_MODEL = openaiConfig_1.default.get('OPENAI_MODEL');
        debug('Sending follow-up request with the following configuration:');
        debug('OPENAI_MODEL:', OPENAI_MODEL);
        debug('API_KEY:', API_KEY);
        // Guard against missing API key
        if (!API_KEY) {
            console.error('Critical configuration missing: API_KEY');
            return null;
        }
        const openai = new openai_1.default({ apiKey: API_KEY });
        try {
            const response = yield openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [{ role: 'user', content: message }],
            });
            debug('Received response:', response);
            return response;
        }
        catch (error) {
            console.error('Error sending follow-up request:', error);
            debug(error.stack); // Improvement: log stack trace for better debugging
            return null;
        }
    });
}
