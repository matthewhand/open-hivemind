const { aliases } = require('../config/aliases');
const logger = require('./logger');

function getRandomAliasCommand() {
    const aliasKeys = Object.keys(aliases);
    const randomIndex = Math.floor(Math.random() * aliasKeys.length);
    return `!${aliasKeys[randomIndex]}`;
}

module.exports = { getRandomAliasCommand };
