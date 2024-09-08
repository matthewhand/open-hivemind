"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandResponse = void 0;
class CommandResponse {
    constructor(success, message, data = null, error = undefined) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
    }
}
exports.CommandResponse = CommandResponse;
