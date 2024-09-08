"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const QuivrConfig_1 = __importDefault(require("../../integrations/quivr/config/QuivrConfig"));
class QuivrHandler {
    constructor() {
        this.config = QuivrConfig_1.default;
        console.log('QuivrHandler initialized with API URL:', this.config.get('QUIVR_API_URL'));
    }
    handleCommand(command) {
        const apiUrl = this.config.get('QUIVR_API_URL');
        if (apiUrl) {
            console.log(`Handling command with Quivr API URL: ${apiUrl}`);
            // Implement HTTP request to Quivr API here using apiUrl
        }
        else {
            console.error('Quivr API URL is not configured');
        }
    }
}
exports.default = QuivrHandler;
