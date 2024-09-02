import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:loadIntegrationConfigs');

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
export function loadIntegrationConfigs(): Record<string, any> {
    const integrationsPath = path.resolve(__dirname, '../integrations');
    const integrationConfigs: Record<string, any> = {};

    // Read all subdirectories in the integrations directory
    const integrationDirs = fs.readdirSync(integrationsPath);

    integrationDirs.forEach((dirName) => {
        const configPath = path.join(integrationsPath, dirName, 'config');
        if (fs.existsSync(configPath)) {
            const configFiles = fs.readdirSync(configPath);
            configFiles.forEach((fileName) => {
                if (fileName.endsWith('.js')) {
                    try {
                        const config = require(path.join(configPath, fileName));
                        integrationConfigs[dirName] = config;
                        debug(`Loaded config for integration: ${dirName}`);
                    } catch (error) {
                        debug(`Error loading config for integration ${dirName}:`, error);
                    }
                }
            });
        } else {
            debug(`Config directory does not exist for integration: ${dirName}`);
        }
    });

    return integrationConfigs;
}
