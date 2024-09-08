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
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const createChatCompletion_1 = require("./createChatCompletion");
// Mock IMessage with required fields
const mockMessage = {
    role: 'user',
    content: 'Hello',
    getAuthorId: () => 'user123',
    client: {},
    channelId: '1234',
    data: {},
    getMessageId: () => '5678',
    getTimestamp: () => new Date(),
};
// Mock dependencies
const mockOpenAI = {
    chat: {
        completions: {
            create: () => __awaiter(void 0, void 0, void 0, function* () { return ({ choices: [{ message: { content: 'mock response' } }] }); }),
        },
    },
};
(0, mocha_1.describe)('createChatCompletion', () => {
    (0, mocha_1.it)('should return a valid completion response', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, createChatCompletion_1.createChatCompletion)(mockOpenAI, [mockMessage], 'system message', 100);
        (0, chai_1.expect)(response).to.equal('mock response');
    }));
    (0, mocha_1.it)('should handle an empty completion response', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockEmptyOpenAI = {
            chat: {
                completions: {
                    create: () => __awaiter(void 0, void 0, void 0, function* () { return ({ choices: [] }); }),
                },
            },
        };
        const response = yield (0, createChatCompletion_1.createChatCompletion)(mockEmptyOpenAI, [mockMessage], 'system message', 100);
        (0, chai_1.expect)(response).to.equal('');
    }));
});
