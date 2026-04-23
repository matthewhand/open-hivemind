import convict from 'convict';
import path from 'path';

const databaseConfig = convict({
  DATABASE_TYPE: {
    doc: 'Database type (sqlite or postgres)',
    format: ['sqlite', 'postgres'],
    default: 'sqlite',
    env: 'DATABASE_TYPE',
  },
  DATABASE_PATH: {
    doc: 'Path to SQLite database file',
    format: String,
    default: 'data/hivemind.db',
    env: 'DATABASE_PATH',
  },
  DATABASE_URL: {
    doc: 'Postgres connection URL (overrides individual postgres settings)',
    format: '*',
    default: '',
    env: 'DATABASE_URL',
    sensitive: true,
  },
  DATABASE_HOST: {
    doc: 'Postgres host',
    format: String,
    default: 'localhost',
    env: 'DATABASE_HOST',
  },
  DATABASE_PORT: {
    doc: 'Postgres port',
    format: 'port',
    default: 5432,
    env: 'DATABASE_PORT',
  },
  DATABASE_USER: {
    doc: 'Postgres user',
    format: String,
    default: 'postgres',
    env: 'DATABASE_USER',
  },
  DATABASE_PASSWORD: {
    doc: 'Postgres password',
    format: String,
    default: '',
    env: 'DATABASE_PASSWORD',
    sensitive: true,
  },
  DATABASE_NAME: {
    doc: 'Postgres database name',
    format: String,
    default: 'hivemind',
    env: 'DATABASE_NAME',
  },
  DATABASE_SSL: {
    doc: 'Whether to use SSL for Postgres connection',
    format: Boolean,
    default: false,
    env: 'DATABASE_SSL',
  },
  LOG_TO_DATABASE: {
    doc: 'Whether to persist logs to the database',
    format: Boolean,
    default: false,
    env: 'LOG_TO_DATABASE',
  },
  LOG_RETENTION_DAYS: {
    doc: 'Number of days to retain logs in database',
    format: 'int',
    default: 30,
    env: 'LOG_RETENTION_DAYS',
  },
});

// Load existing config file if it exists
const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
const configPath = path.join(configDir, 'providers/database.json');

try {
  const fs = require('fs');
  if (fs.existsSync(configPath)) {
    databaseConfig.loadFile(configPath);
  }
} catch (e) {
  // Ignore errors reading file
}

databaseConfig.validate({ allowed: 'warn' });

export default databaseConfig;
