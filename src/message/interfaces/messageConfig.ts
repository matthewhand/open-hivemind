import convict from 'convict';
import path from 'path';

const messageConfig = convict({
  MESSAGE_PROVIDER: { doc: 'Messaging platform', format: String, default: 'discord', env: 'MESSAGE_PROVIDER' },
  MESSAGE_IGNORE_BOTS: { doc: 'Ignore bot messages', format: Boolean, default: true, env: 'MESSAGE_IGNORE_BOTS' },
  MESSAGE_ADD_USER_HINT: { doc: 'Add user hints', format: Boolean, default: true, env: 'MESSAGE_ADD_USER_HINT' },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: { doc: 'Max messages/minute per channel', format: 'int', default: 5, env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL' },
  MESSAGE_MIN_DELAY: { doc: 'Min response delay (ms)', format: 'int', default: 1000, env: 'MESSAGE_MIN_DELAY' },
  MESSAGE_MAX_DELAY: { doc: 'Max response delay (ms)', format: 'int', default: 10000, env: 'MESSAGE_MAX_DELAY' },
  MESSAGE_ACTIVITY_TIME_WINDOW: { doc: 'Silence window (ms)', format: 'int', default: 300000, env: 'MESSAGE_ACTIVITY_TIME_WINDOW' },
  MESSAGE_WAKEWORDS: { doc: 'Wakewords (comma-separated)', format: String, default: '!help,!ping', env: 'MESSAGE_WAKEWORDS' },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: { doc: 'Only respond when addressed', format: Boolean, default: true, env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO' },
  MESSAGE_INTERACTIVE_FOLLOWUPS: { doc: 'Send follow-ups after silence', format: Boolean, default: false, env: 'MESSAGE_INTERACTIVE_FOLLOWUPS' },
  MESSAGE_UNSOLICITED_ADDRESSED: { doc: 'Unsolicited responses in addressed channels', format: Boolean, default: false, env: 'MESSAGE_UNSOLICITED_ADDRESSED' },
  MESSAGE_UNSOLICITED_UNADDRESSED: { doc: 'Unsolicited responses in unaddressed channels', format: Boolean, default: false, env: 'MESSAGE_UNSOLICITED_UNADDRESSED' },
  MESSAGE_RESPOND_IN_THREAD: { doc: 'Respond in threads', format: Boolean, default: false, env: 'MESSAGE_RESPOND_IN_THREAD' },
  MESSAGE_THREAD_RELATION_WINDOW: { doc: 'Time window for related posts (ms)', format: 'int', default: 300000, env: 'MESSAGE_THREAD_RELATION_WINDOW' }
});

messageConfig.loadFile(path.join(__dirname, '../../../config/default.json'));
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
