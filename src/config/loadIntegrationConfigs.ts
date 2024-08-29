import { readdirSync } from 'fs';
import { join } from 'path';
import Debug from 'debug';

const debug = Debug('app:loadIntegrationConfigs');

export function loadIntegrationConfigs(): Record<string, any> {
  const integrationsPath = join(__dirname, '../integrations');
  const configFiles = readdirSync(integrationsPath);
  const integrationConfigs: Record<string, any> = {};

  configFiles.forEach((file) => {
    try {
      const config = require(join(integrationsPath, file, 'config'));
      integrationConfigs[file] = config.default;
    } catch (error: any) {
      debug(`Error loading config for integration ${file}: ${error.message}`);
    }
  });

  return integrationConfigs;
}
