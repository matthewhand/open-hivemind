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
exports.sendCompletion = sendCompletion;
const openai_1 = require("openai");
const debug_1 = __importDefault(require("debug"));
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug = (0, debug_1.default)('app:sendCompletions');
function sendCompletion() {
    return __awaiter(this, void 0, void 0, function* () {
        const openai = new openai_1.OpenAI({ apiKey: openaiConfig_1.default.get('OPENAI_API_KEY') });
        try {
            const response = yield openai.completions.create({
                model: openaiConfig_1.default.get('OPENAI_MODEL'),
                prompt: 'Your prompt here',
                max_tokens: openaiConfig_1.default.get('OPENAI_MAX_TOKENS'),
                temperature: openaiConfig_1.default.get('OPENAI_TEMPERATURE')
            });
            if (!response.choices || !response.choices.length) {
                throw new Error('No completion choices returned.');
            }
            debug('Completion generated:', response.choices[0].text.trim());
        }
        catch (error) {
            debug('Error generating completion:', error.message);
            throw error;
        }
    });
}
