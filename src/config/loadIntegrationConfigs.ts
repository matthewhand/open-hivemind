import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:loadIntegrationConfigs');

export function loadIntegrationConfigs(): Record<string, any> {
    const integrationsPath = path.resolve(__dirname, '../integrations');
    const integrationConfigs: Record<string, any> = {};

    // Read all subdirectories in the integrations directory
    const integrationDirs = fs.readdirSync(integrationsPath);

    integrationDirs.forEach((dirName) => {
        const configPath = path.join(integrationsPath, dirName, 'config');
        const jsConfigPath = path.join(configPath, 'index.js');
        if (fs.existsSync(jsConfigPath)) {
            try {
                const config = require(jsConfigPath);
                integrationConfigs[dirName] = config;
                debug(`Loaded config for integration: ${dirName}`);
            } catch (error) {
                debug(`Error loading config for integration ${dirName}:`, error);
            }
        } else {
            debug(`Config not found for integration: ${dirName}`);
        }
    });

    return integrationConfigs;
}
