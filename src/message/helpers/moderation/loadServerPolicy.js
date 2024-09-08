"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = loadServerPolicy;
const debug_1 = __importDefault(require("debug"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug = (0, debug_1.default)('app:loadServerPolicy');
/**
 * Loads the server's moderation policy from a JSON configuration file.
 *
 * This function reads the server policy from a JSON file located in the config directory.
 * It logs the success or failure of loading the policy and throws an error if the policy
 * cannot be loaded.
 *
 * @returns {string} The server policy as a string.
 */
function loadServerPolicy() {
    try {
        const policyPath = path_1.default.resolve(__dirname, '../../config/serverPolicy.json');
        const policyData = fs_1.default.readFileSync(policyPath, 'utf-8');
        debug('[loadServerPolicy] Server policy loaded successfully.');
        return policyData;
    }
    catch (error) {
        debug('[loadServerPolicy] Failed to load server policy: ' + error.message);
        throw new Error('Unable to load server policy.');
    }
}
