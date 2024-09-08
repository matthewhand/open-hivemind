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
exports.replicate = replicate;
const axios_1 = __importDefault(require("axios"));
const replicateConfig_1 = __importDefault(require("@integrations/replicate/config/replicateConfig"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:replicate');
/**
 * Calls the Replicate API to run a model prediction.
 *
 * This function interacts with the Replicate API using the provided model version and input data.
 * It handles the API request and processes the response or errors accordingly.
 *
 * Key Features:
 * - **API Integration**: Interacts with the Replicate API to run model predictions.
 * - **Error Handling**: Captures and logs errors during the API call.
 * - **Configuration**: Uses `replicateConfig` for API URL, key, and model version.
 */
function replicate(inputData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const apiUrl = replicateConfig_1.default.get('REPLICATE_API_URL');
            const apiKey = replicateConfig_1.default.get('REPLICATE_API_KEY');
            const modelVersion = replicateConfig_1.default.get('REPLICATE_MODEL_VERSION');
            const response = yield axios_1.default.post(`${apiUrl}/v1/predictions`, {
                version: modelVersion,
                input: inputData
            }, {
                headers: {
                    Authorization: `Token ${apiKey}`
                }
            });
            return response.data;
        }
        catch (error) {
            debug(`Failed to call Replicate API: ${error.message}`);
            throw error;
        }
    });
}
