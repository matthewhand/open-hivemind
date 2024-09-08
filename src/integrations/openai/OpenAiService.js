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
exports.OpenAiService = void 0;
const debug_1 = __importDefault(require("debug"));
const openai_1 = require("openai");
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const llmConfig_1 = __importDefault(require("@llm/interfaces/llmConfig"));
const generateChatResponse_1 = require("./operations/generateChatResponse");
const createChatCompletion_1 = require("./chat/createChatCompletion");
const listModels_1 = require("./operations/listModels");
const debug = (0, debug_1.default)('app:OpenAiService');
// Guard: Validate openaiConfig object
if (!openaiConfig_1.default || typeof openaiConfig_1.default.get !== 'function') {
    throw new Error('Invalid OpenAI configuration: expected an object with a get method.');
}
// Guard: Validate llmConfig object
if (!llmConfig_1.default || typeof llmConfig_1.default.get !== 'function') {
    throw new Error('Invalid LLM configuration: expected an object with a get method.');
}
class OpenAiService {
    constructor() {
        this.busy = false;
        // Ensure values are either valid or defaulted properly
        const timeoutValue = String(openaiConfig_1.default.get('OPENAI_TIMEOUT') || '30000');
        this.requestTimeout = isNaN(Number(timeoutValue)) ? 30000 : Number(timeoutValue);
        const options = {
            apiKey: String(openaiConfig_1.default.get('OPENAI_API_KEY') || ''),
            organization: String(openaiConfig_1.default.get('OPENAI_ORGANIZATION') || ''),
            baseURL: String(openaiConfig_1.default.get('OPENAI_BASE_URL') || 'https://api.openai.com'),
            timeout: this.requestTimeout,
        };
        this.openai = new openai_1.OpenAI(options);
        this.parallelExecution = Boolean(llmConfig_1.default.get('LLM_PARALLEL_EXECUTION'));
        // Adjust Path<> type constraint for finishReasonRetry
        this.finishReasonRetry = openaiConfig_1.default.get('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = Number(openaiConfig_1.default.get('OPENAI_MAX_RETRIES') || 3);
        debug('[DEBUG] OpenAiService initialized with API Key:', options.apiKey, 'Timeout:', this.requestTimeout);
    }
    static getInstance() {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }
    isBusy() {
        return this.busy;
    }
    setBusy(status) {
        this.busy = status;
    }
    createChatCompletion(historyMessages_1) {
        return __awaiter(this, arguments, void 0, function* (historyMessages, systemMessageContent = String(openaiConfig_1.default.get('OPENAI_SYSTEM_PROMPT') || ''), maxTokens = Number(openaiConfig_1.default.get('OPENAI_RESPONSE_MAX_TOKENS') || 150)) {
            return (0, createChatCompletion_1.createChatCompletion)(this.openai, historyMessages, systemMessageContent, maxTokens);
        });
    }
    generateChatResponse(message, historyMessages) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, generateChatResponse_1.generateChatResponse)(this, message, historyMessages, {
                parallelExecution: this.parallelExecution,
                maxRetries: this.maxRetries,
                finishReasonRetry: this.finishReasonRetry,
                isBusy: this.isBusy.bind(this),
                setBusy: this.setBusy.bind(this),
            });
        });
    }
    listModels() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, listModels_1.listModels)(this.openai);
        });
    }
}
exports.OpenAiService = OpenAiService;
exports.default = OpenAiService.getInstance();
