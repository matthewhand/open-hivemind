"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ZepConfig_1 = __importDefault(require("../../integrations/zep/config/ZepConfig"));
class ZepHandler {
    constructor() {
        this.config = ZepConfig_1.default;
        console.log('ZepHandler initialized with API URL:', this.config.get('ZEP_API_URL'));
    }
    handleCommand(command) {
        const apiUrl = this.config.get('ZEP_API_URL');
        if (apiUrl) {
            console.log(`Handling command with Zep API URL: ${apiUrl}`);
            // Implement HTTP request to Zep API here using apiUrl
        }
        else {
            console.error('Zep API URL is not configured');
        }
    }
}
exports.default = ZepHandler;
