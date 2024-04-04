const { aliases } = require('../config/aliases');

// Returns a random command prefixed with "!"
function getRandomAliasCommand() {
    const aliasKeys = Object.keys(aliases);
    const randomIndex = Math.floor(Math.random() * aliasKeys.length);
    return `!${aliasKeys[randomIndex]}`;
}

// Fetches the description for a given alias
function getAliasDescription(commandName) {
    const alias = aliases[commandName.toLowerCase()];
    return alias ? alias.description : 'No description available.';
}

// Lists all aliases with their descriptions, formatted as a string
function listAllAliases() {
    return Object.entries(aliases).map(([command, {description}]) => 
        `!${command} - ${description}`).join('\n');
}

// Optional: Find aliases by category (if your aliases are categorized)
function findAliasesByCategory(category) {
    return Object.entries(aliases)
        .filter(([_, alias]) => alias.category === category)
        .reduce((acc, [command, {description}]) => {
            acc[command] = description;
            return acc;
        }, {});
}

// Get detailed info for an alias, optionally formatted for display
function getDetailedAliasInfo(commandName) {
    const alias = aliases[commandName.toLowerCase()];
    if (!alias) {
        return 'Alias does not exist.';
    }
    // Assuming you might add more detailed info in aliases, like categories, handlers, etc.
    const { handler, description } = alias;
    return `Command: !${commandName}\nHandler: ${handler}\nDescription: ${description}`;
}

module.exports = { 
    getRandomAliasCommand, 
    getAliasDescription, 
    listAllAliases,
    findAliasesByCategory,
    getDetailedAliasInfo
};
