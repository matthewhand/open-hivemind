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
exports.getFlowiseData = getFlowiseData;
const flowiseConfig_1 = __importDefault(require("@integrations/flowise/interfaces/flowiseConfig"));
const axios_1 = __importDefault(require("axios"));
/**
 * Fetches data from Flowise API using the configured base URL and API key.
 *
 * @returns {Promise<any>} The API response data.
 */
function getFlowiseData() {
    return __awaiter(this, void 0, void 0, function* () {
        const baseURL = flowiseConfig_1.default.get('FLOWISE_API_URL');
        const apiKey = flowiseConfig_1.default.get('FLOWISE_API_KEY');
        if (!baseURL || !apiKey) {
            throw new Error('Flowise base URL or API key is missing.');
        }
        try {
            const response = yield axios_1.default.get(baseURL, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching data from Flowise API:', error);
            throw error;
        }
    });
}
