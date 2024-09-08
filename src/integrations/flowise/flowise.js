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
exports.FlowiseCommand = void 0;
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const debug = (0, debug_1.default)('app:flowiseCommand');
class FlowiseCommand {
    constructor() {
        this.name = 'flowise';
        this.description = 'Interact with the Flowise API to retrieve information based on the provided endpoint ID.';
    }
    /**
     * Executes the Flowise API command.
     * @param args The command arguments, including an optional endpointId.
     * @returns An object indicating the success of the operation, a message, and optionally any additional data.
     */
    execute(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { endpointId } = args;
            // Guard: Check if the API base URL is defined in the environment variables
            const apiUrl = process.env.FLOWISE_BASE_URL;
            if (!apiUrl) {
                const errorMessage = 'Flowise API base URL is not defined in the environment variables.';
                debug(errorMessage);
                return { success: false, message: errorMessage };
            }
            debug('Flowise API base URL: ' + apiUrl);
            // Guard: Ensure API key is provided
            const apiKey = process.env.FLOWISE_API_KEY;
            if (!apiKey) {
                const errorMessage = 'Flowise API key is missing.';
                debug(errorMessage);
                return { success: false, message: errorMessage };
            }
            debug('Flowise API Key: ' + apiKey);
            // Guard: Ensure endpointId is provided
            if (!endpointId) {
                const errorMessage = 'Endpoint ID is required but was not provided.';
                debug(errorMessage);
                return { success: false, message: errorMessage };
            }
            debug('Endpoint ID: ' + endpointId);
            // Construct the full API URL
            const url = apiUrl + endpointId;
            debug('Constructed Flowise API URL: ' + url);
            try {
                // Log the request headers for better debugging
                const headers = { 'Authorization': 'Bearer ' + apiKey };
                debug('Request Headers:', headers);
                // Make a GET request to the Flowise API
                const response = yield axios_1.default.get(url, { headers });
                debug('Flowise API response status: ' + response.status);
                // Return success response with data
                return { success: true, message: 'Request successful', data: response.data };
            }
            catch (error) {
                // Handle and log any errors that occur during the API request
                debug('Flowise API request failed: ' + error.message);
                return { success: false, message: 'Flowise API request failed', error: error.message };
            }
        });
    }
}
exports.FlowiseCommand = FlowiseCommand;
