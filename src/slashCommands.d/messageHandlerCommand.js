const { config, saveConfig } = require('./configUtils'); // Assuming these functions exist

async function messageHandlerCommand(interaction) {
    // Check if the interaction has the 'handler' option
    if (!interaction.options.getString('handler')) {
        // No handler provided, show current setting
        const currentSetting = getCurrentHandlerSetting(interaction.guild.id);
        await interaction.reply(`Current message handler setting: ${currentSetting}`);
    } else {
        // Handler argument provided, update the setting
        const newSetting = interaction.options.getString('handler');
        updateHandlerSetting(interaction.guild.id, newSetting);
        await interaction.reply(`Message handler updated to: ${newSetting}`);
    }
}

function getCurrentHandlerSetting(guildId) {
    // Retrieve the current setting for the server
    return config.guildHandlers[guildId] || 'Default Handler (e.g., !mixtral)';
}

function updateHandlerSetting(guildId, newSetting) {
    // Update the setting for the server
    config.guildHandlers[guildId] = newSetting;
    saveConfig(); // Save the updated config
}

module.exports = { messageHandlerCommand };
