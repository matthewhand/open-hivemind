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
exports.createChatCompletion = createChatCompletion;
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
function convertIMessageToChatParam(historyMessages) {
    return historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.getAuthorId() || 'unknown',
    }));
}
function createChatCompletion(openai, historyMessages, systemMessageContent, maxTokens) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const messages = convertIMessageToChatParam(historyMessages);
        messages.unshift({ role: 'system', content: systemMessageContent, name: 'system' });
        // Adjust OpenAI API call to match overloads
        const response = yield openai.chat.completions.create({
            model: openaiConfig_1.default.get('OPENAI_MODEL'),
            messages,
            max_tokens: maxTokens,
            temperature: openaiConfig_1.default.get('OPENAI_TEMPERATURE')
        });
        if (!response || !response.choices || response.choices.length === 0) {
            return '';
        }
        return ((_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || '';
    });
}
