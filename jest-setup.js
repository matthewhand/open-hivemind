const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@src': path.resolve(__dirname, 'src'),
  '@command': path.resolve(__dirname, 'src/command'),
  '@common': path.resolve(__dirname, 'src/common'),
  '@config': path.resolve(__dirname, 'src/config'),
  '@llm': path.resolve(__dirname, 'src/llm'),
  '@message': path.resolve(__dirname, 'src/message'),
  '@webhook': path.resolve(__dirname, 'src/webhook'),
  '@integrations': path.resolve(__dirname, 'src/integrations'),
});

if (process.env.NODE_ENV === 'test') {
  process.env.SLACK_BOT_TOKEN = 'dummy-bot-token';
  process.env.SLACK_SIGNING_SECRET = 'dummy-signing-secret';
  process.env.SLACK_JOIN_CHANNELS = 'dummy-channel';
  process.env.SLACK_DEFAULT_CHANNEL_ID = 'dummy-default-channel';
  process.env.SLACK_MODE = 'socket';
}
