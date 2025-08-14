import convict from 'convict';
import path from 'path';
import Debug from 'debug';

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

