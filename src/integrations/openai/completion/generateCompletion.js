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
exports.generateCompletion = generateCompletion;
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug = (0, debug_1.default)('app:OpenAiService');
/**
 * Generates a completion using the OpenAI API.
 *
 * This function sends a prompt to the OpenAI API and returns the generated completion.
 *
 * @param {string} prompt - The prompt to send to the OpenAI API.
 * @returns {Promise<string>} - The generated completion from the API.
 */
function generateCompletion(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!openaiConfig_1.default || !openaiConfig_1.default.get('OPENAI_API_KEY')) {
            throw new Error('OpenAI configuration is missing or incomplete.');
        }
        try {
            const response = yield axios_1.default.post('https://api.openai.com/v1/completions', {
                model: openaiConfig_1.default.get('OPENAI_MODEL') || 'gpt-4o-mini',
                prompt,
                max_tokens: openaiConfig_1.default.get('OPENAI_MAX_TOKENS') || 100,
                temperature: 0.7,
            }, {
                headers: {
                    'Authorization': `Bearer ${openaiConfig_1.default.get('OPENAI_API_KEY')}`,
                },
            });
            debug('Generated completion:', response.data.choices[0].text.trim());
            return response.data.choices[0].text.trim();
        }
        catch (error) {
            debug('Error generating completion:', error);
            debug(error.stack); // Improvement: log stack trace for debugging
            throw new Error(`Failed to generate completion: ${error.message}`);
        }
    });
}
