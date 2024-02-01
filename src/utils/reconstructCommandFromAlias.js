const { aliases } = require('../config/aliases');

function reconstructCommandFromAlias(alias, additionalArgs) {
    if (!aliases[alias]) return null;

    let [aliasedCommand, action] = aliases[alias].split(':');
    return `!${aliasedCommand}${action ? ':' + action : ''} ${additionalArgs}`.trim();
}

module.exports = { reconstructCommandFromAlias };
