import convict from 'convict';
import path from 'path';

const databaseConfig = convict({
  DATABASE_TYPE: {
    doc: 'Database type (sqlite, postgres, or mysql). If unset, may be inferred from DATABASE_URL scheme.',
    format: ['sqlite', 'postgres', 'mysql'],
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
    doc: 'Connection URL for Postgres or MySQL (overrides individual host/port/user settings)',
    format: '*',
    default: '',
    env: 'DATABASE_URL',
    sensitive: true,
  },
  DATABASE_HOST: {
    doc: 'Database host (postgres/mysql when not using DATABASE_URL)',
    format: String,
    default: 'localhost',
    env: 'DATABASE_HOST',
  },
  DATABASE_PORT: {
    doc: 'Database port (postgres/mysql when not using DATABASE_URL)',
    format: 'port',
    default: 5432,
    env: 'DATABASE_PORT',
  },
  DATABASE_USER: {
    doc: 'Database user (postgres/mysql when not using DATABASE_URL)',
    format: String,
    default: 'postgres',
    env: 'DATABASE_USER',
  },
  DATABASE_PASSWORD: {
    doc: 'Database password (postgres/mysql when not using DATABASE_URL)',
    format: String,
    default: '',
    env: 'DATABASE_PASSWORD',
    sensitive: true,
  },
  DATABASE_NAME: {
    doc: 'Database name (postgres/mysql when not using DATABASE_URL)',
    format: String,
    default: 'hivemind',
    env: 'DATABASE_NAME',
  },
  DATABASE_SSL: {
    doc: 'Whether to use SSL for remote database connections',
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
  MAX_HISTORY_ROWS: {
    doc: 'Maximum number of rows to keep in history tables',
    format: 'int',
    default: 10000,
    env: 'MAX_HISTORY_ROWS',
  },
  AUTO_RETENTION: {
    doc: 'Whether to automatically adjust retention based on DB type (Lite/Standard/Cloud)',
    format: Boolean,
    default: true,
    env: 'DATABASE_AUTO_RETENTION',
  },
  AUTO_CLEANUP_ON_STARTUP: {
    doc: 'Whether to run database cleanup on application startup',
    format: Boolean,
    default: true,
    env: 'DATABASE_AUTO_CLEANUP_STARTUP',
  },
  MEMORY_RETENTION_DAYS: {
    doc: 'Delete stored memories older than this many days during cleanup. 0 disables memory TTL eviction (opt-in).',
    format: 'int',
    default: 0,
    env: 'MEMORY_RETENTION_DAYS',
  },
  MEMORY_MAX_ENTRIES: {
    doc: 'Keep at most this many of the newest memories during cleanup. 0 disables memory max-count eviction (opt-in).',
    format: 'int',
    default: 0,
    env: 'MEMORY_MAX_ENTRIES',
  },
  PERSIST_CONFIG: {
    doc: 'Whether to persist bot configurations to the database',
    format: Boolean,
    default: true,
    env: 'DATABASE_PERSIST_CONFIG',
  },
  PERSIST_MESSAGES: {
    doc: 'Whether to persist user messages to the database',
    format: Boolean,
    default: true,
    env: 'DATABASE_PERSIST_MESSAGES',
  },
  PERSIST_INFERENCE: {
    doc: 'Whether to persist LLM inference logs to the database',
    format: Boolean,
    default: true,
    env: 'DATABASE_PERSIST_INFERENCE',
  },
  ENCRYPTION_KEY: {
    doc: 'Master key for database at-rest encryption',
    format: String,
    default: '',
    env: 'DATABASE_ENCRYPTION_KEY',
    sensitive: true,
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
} catch {
  // Ignore errors reading file
}

databaseConfig.validate({ allowed: 'warn' });

export default databaseConfig;
