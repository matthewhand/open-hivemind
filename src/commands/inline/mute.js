const { SlashCommandBuilder } = require('@discordjs/builders');
const { getRandomErrorMessage } = require('../../utils/errorMessages');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a user')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to mute')
                .setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        if (!target) {
            await interaction.reply({ content: getRandomErrorMessage(), ephemeral: true });
            return;
        }

        try {
            // Mute logic here
            logger.info('User ' + target.tag + ' has been muted.');
            await interaction.reply('User ' + target.tag + ' has been muted.');
        } catch (error) {
            logger.error('Error muting user: ' + error);
            await interaction.reply({ content: getRandomErrorMessage(), ephemeral: true });
        }
    },
};
