"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadIntegrationConfigs = loadIntegrationConfigs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:loadIntegrationConfigs');
/**
 * Loads integration configurations dynamically from the `integrations` directory.
 *
 * This function uses relative paths because the configurations are loaded at runtime,
 * and the exact directory structure must be preserved. Using an alias for paths could
 * lead to issues after transpilation or during runtime, especially in environments where
 * the path resolution might differ.
 *
 * Key Features:
 * - **Dynamic Loading**: Reads subdirectories within the `integrations` directory to find and load configurations.
 * - **Error Handling**: Catches and logs errors during the loading process.
 * - **Debugging**: Includes debug statements to track which configurations are loaded.
 *
 * @returns {Record<string, any>} A record of the loaded integration configurations.
 */
function loadIntegrationConfigs() {
    const integrationsPath = path_1.default.resolve(__dirname, '../integrations');
    const integrationConfigs = {};
    // Read all subdirectories in the integrations directory
    const integrationDirs = fs_1.default.readdirSync(integrationsPath);
    integrationDirs.forEach((dirName) => {
        const configPath = path_1.default.join(integrationsPath, dirName, 'config');
        if (fs_1.default.existsSync(configPath)) {
            const configFiles = fs_1.default.readdirSync(configPath);
            configFiles.forEach((fileName) => {
                if (fileName.endsWith('.js')) {
                    try {
                        const config = require(path_1.default.join(configPath, fileName));
                        integrationConfigs[dirName] = config;
                        debug(`Loaded config for integration: ${dirName}`);
                    }
                    catch (error) {
                        debug(`Error loading config for integration ${dirName}:`, error);
                    }
                }
            });
        }
        else {
            debug(`Config directory does not exist for integration: ${dirName}`);
        }
    });
    return integrationConfigs;
}
