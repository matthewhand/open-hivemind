import convict from 'convict';
import path from 'path';
import Debug from 'debug';
import type { ConfigModuleMeta } from './ConfigSpec';

const debug = Debug('app:appConfig');

const appConfig = convict({
  HTTP_ENABLED: {
    doc: 'Enable HTTP server',
    format: Boolean,
    default: true,
    env: 'HTTP_ENABLED'
  },
  PORT: {
    doc: 'HTTP port',
    format: 'port',
    default: 5005,
    env: 'PORT'
  },
  METRICS_ROUTE_ENABLED: {
    doc: 'Enable /metrics endpoint',
    format: Boolean,
    default: false,
    env: 'METRICS_ROUTE_ENABLED'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'app.json');

try {
  appConfig.loadFile(configPath);
  appConfig.validate({ allowed: 'warn' });
} catch (e: any) {
  debug(`No app.json found at ${configPath}; using defaults (${e?.message || e})`);
}

export default appConfig;

// Config metadata for docs and tooling
export const configMeta: ConfigModuleMeta = {
  module: 'appConfig',
  keys: [
    { key: 'HTTP_ENABLED', group: 'app', level: 'basic', doc: 'Enable HTTP server', env: 'HTTP_ENABLED', default: true },
    { key: 'PORT', group: 'app', level: 'basic', doc: 'Port', env: 'PORT', default: 5005 },
    { key: 'METRICS_ROUTE_ENABLED', group: 'app', level: 'advanced', doc: 'Expose /metrics', env: 'METRICS_ROUTE_ENABLED', default: false }
  ]
};
