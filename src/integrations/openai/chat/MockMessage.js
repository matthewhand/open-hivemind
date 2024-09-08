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
exports.MockMessage = void 0;
const IMessage_1 = require("@src/message/interfaces/IMessage");
class MockMessage extends IMessage_1.IMessage {
    constructor(data) {
        super(data, 'user');
        this.userMentions = ['TestUser1', 'TestUser2'];
        this.messageReference = null;
        this.content = 'Test message';
        this.client = {};
        this.channelId = '12345';
        this.role = 'user';
        this.isReplyToBot = () => false;
        this.reply = (content) => __awaiter(this, void 0, void 0, function* () {
            console.log('Replying with:', content);
        });
    }
    getMessageId() {
        return 'test-id';
    }
    getText() {
        return this.content;
    }
    getChannelId() {
        return this.channelId;
    }
    getAuthorId() {
        return 'author-id';
    }
    getChannelTopic() {
        return 'Test Channel Topic';
    }
    getUserMentions() {
        return this.userMentions;
    }
    getChannelUsers() {
        return ['User1', 'User2'];
    }
    mentionsUsers() {
        return this.userMentions.length > 0;
    }
    isFromBot() {
        return false;
    }
    getAuthorName() {
        return 'Test Author';
    }
}
exports.MockMessage = MockMessage;
