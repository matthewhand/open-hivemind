const { SlashCommandBuilder } = require('@discordjs/builders');
const { config, saveConfig } = require('../utils/configUtils'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messagehandler')
        .setDescription('Specifies the handler for processing messages.')
        .addStringOption(option => 
            option.setName('handler')
                .setDescription('The handler to process messages')
                .setRequired(true)),

    async execute(interaction) {
        const handlerName = interaction.options.getString('handler');

        // Update channel handler mapping
        config.channelHandlers = config.channelHandlers || {};
        config.channelHandlers[interaction.channelId] = handlerName;
        saveConfig(); // Save the updated configuration

        await interaction.reply(`Message handler for this channel updated to ${handlerName}`);
    }
};
