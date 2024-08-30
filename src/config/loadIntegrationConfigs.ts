import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:loadIntegrationConfigs');

export function loadIntegrationConfigs(): Record<string, any> {
    const integrationsPath = path.resolve(__dirname, '../integrations');
    const integrationConfigs: Record<string, any> = {};

    // Debug: Log contents of the integrations directory
    debug('Integrations directory contents:', fs.readdirSync(integrationsPath));

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
