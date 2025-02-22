const shouldDebug = require('debug')('app:shouldProcessMessage');
const msgConfig = require('@message/interfaces/messageConfig');

function getMinIntervalMs() {
  return Number(msgConfig.get('MESSAGE_MIN_INTERVAL_MS') || 1000);
}

module.exports = { getMinIntervalMs };
