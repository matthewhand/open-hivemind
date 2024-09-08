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
exports.generateChatResponse = generateChatResponse;
const debug_1 = __importDefault(require("debug"));
const convertIMessageToChatParam_1 = require("./convertIMessageToChatParam");
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug = (0, debug_1.default)('app:OpenAiService');
/**
 * Fetch the first available OpenAI model.
 * @param openAiService - Instance for the request.
 * @returns {Promise<string>} - Model's ID.
 */
function getFirstAvailableModel(openAiService) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const models = yield openAiService.openai.models.list();
        const model = (_a = models.data[0]) === null || _a === void 0 ? void 0 : _a.id;
        if (!model) {
            throw new Error('No OpenAI model available');
        }
        return model;
    });
}
/**
 * Prepare the request body for the OpenAI API.
 * @param message - User message.
 * @param historyMessages - History of the chat.
 * @param model - Model to use.
 * @returns {Array<{ role: string, content: string, name?: string }>}
 */
function prepareRequestBody(message, historyMessages, model) {
    return [
        { role: 'user', content: message },
        ...historyMessages.map((msg) => (Object.assign(Object.assign({}, (0, convertIMessageToChatParam_1.convertIMessageToChatParam)(msg)), { name: msg.getAuthorId() || '' }))),
    ];
}
/**
 * Handle retries for the chat completion.
 * @param func - Function to retry.
 * @param retries - Max retry attempts.
 * @returns {Promise<any>} - Function result.
 */
function retry(func, retries) {
    return __awaiter(this, void 0, void 0, function* () {
        let attempts = 0;
        while (attempts < retries) {
            try {
                return yield func();
            }
            catch (error) {
                attempts++;
                if (attempts >= retries) {
                    throw error;
                }
                debug(`Retry attempt ${attempts} failed, retrying...`);
            }
        }
    });
}
/**
 * Generate a chat response using OpenAI.
 * @param openAiService - OpenAiService instance.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
 * @returns {Promise<string | null>} - Chat response or null.
 */
function generateChatResponse(openAiService, message, historyMessages, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            debug('message:', message);
            debug('historyMessages:', historyMessages);
            debug('options:', options);
            if (!message) {
                throw new Error('No input message provided.');
            }
            if (!historyMessages || historyMessages.length === 0) {
                throw new Error('No history messages provided.');
            }
            const model = yield getFirstAvailableModel(openAiService);
            const requestBody = prepareRequestBody(message, historyMessages, model);
            debug('Request Body:', requestBody);
            if (options.isBusy()) {
                debug('Service is busy.');
                return null;
            }
            options.setBusy(true);
            const maxTokens = openaiConfig_1.default.get('OPENAI_MAX_TOKENS');
            const temperature = openaiConfig_1.default.get('OPENAI_TEMPERATURE');
            const response = yield retry(() => openAiService.openai.chat.completions.create({
                model,
                messages: requestBody,
                max_tokens: maxTokens,
                temperature: temperature,
            }), options.maxRetries);
            options.setBusy(false);
            debug('Response:', response);
            if (!response || !response.choices || response.choices.length === 0) {
                throw new Error('No completion choices returned.');
            }
            return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || '';
        }
        catch (error) {
            debug('Error:', error.message);
            options.setBusy(false);
            throw new Error(`Failed: ${error.message}`);
        }
    });
}
