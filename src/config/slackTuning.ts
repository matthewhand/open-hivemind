import convict from 'convict';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:slackTuning');

const slackTuning = convict({
  SLACK_SEND_QUEUE_ENABLED: {
    doc: 'Enable Slack send queue (rate limiting)',
    format: Boolean,
    default: true,
    env: 'SLACK_SEND_QUEUE_ENABLED',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_TOKENS_PER_INTERVAL: {
    doc: 'Tokens per interval for Slack queue',
    format: 'int',
    default: 20,
    env: 'SLACK_SEND_TOKENS_PER_INTERVAL',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_INTERVAL_MS: {
    doc: 'Interval window (ms) for Slack queue',
    format: 'int',
    default: 1000,
    env: 'SLACK_SEND_INTERVAL_MS',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_MAX_CONCURRENCY: {
    doc: 'Max parallel sends',
    format: 'int',
    default: 2,
    env: 'SLACK_SEND_MAX_CONCURRENCY',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_MAX_QUEUE_SIZE: {
    doc: 'Max queued tasks before rejecting (unset = unlimited)',
    format: 'int',
    default: 0,
    env: 'SLACK_SEND_MAX_QUEUE_SIZE',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_RETRIES: {
    doc: 'Send retries',
    format: 'int',
    default: 3,
    env: 'SLACK_SEND_RETRIES',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_MIN_DELAY_MS: {
    doc: 'Min delay for send retry backoff',
    format: 'int',
    default: 300,
    env: 'SLACK_SEND_MIN_DELAY_MS',
    level: 'advanced',
    group: 'slack'
  },
  SLACK_SEND_MAX_DELAY_MS: {
    doc: 'Max delay for send retry backoff',
    format: 'int',
    default: 5000,
    env: 'SLACK_SEND_MAX_DELAY_MS',
    level: 'advanced',
    group: 'slack'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'slack-tuning.json');

try {
  slackTuning.loadFile(configPath);
  slackTuning.validate({ allowed: 'warn' });
} catch (e: any) {
  debug(`No slack-tuning.json at ${configPath}; using defaults (${e?.message || e})`);
}

export default slackTuning;
