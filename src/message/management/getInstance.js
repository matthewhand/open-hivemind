"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MessageResponseManager {
    constructor() { }
    static getInstance() {
        if (!MessageResponseManager.instance) {
            MessageResponseManager.instance = new MessageResponseManager();
        }
        return MessageResponseManager.instance;
    }
}
exports.default = MessageResponseManager;
