const { SlashCommandBuilder } = require('@discordjs/builders');
const { isUserAllowed, isRoleAllowed } = require('../utils/permissions');

// Retrieve allowed users and roles from environment variables
const allowedUsers = process.env.BOT_ALLOWED_USERS ? process.env.BOT_ALLOWED_USERS.split(',') : [];
const allowedRoles = process.env.BOT_ALLOWED_ROLES ? process.env.BOT_ALLOWED_ROLES.split(',') : [];
const nonOverridableEnvVars = new Set(['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID']);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Updates the bot configuration.')
        .addStringOption(option =>
            option.setName('setting')
                .setDescription('The configuration setting to update')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('The new value for the setting')
                .setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userRoles = interaction.member.roles.cache.map(role => role.id);

        if (!isUserAllowed(userId, allowedUsers) && !isRoleAllowed(userRoles, allowedRoles)) {
            await interaction.reply({ content: 'You do not have permission to execute this command.', ephemeral: true });
            return;
        }

        const setting = interaction.options.getString('setting');
        const value = interaction.options.getString('value');

        if (nonOverridableEnvVars.has(setting)) {
            await interaction.reply({ content: `The setting ${setting} cannot be overridden.`, ephemeral: true });
            return;
        }

        if (!(setting in process.env)) {
            await interaction.reply({ content: `Invalid setting. Make sure the setting name is correct.`, ephemeral: true });
            return;
        }

        await interaction.reply({ content: `Configuration updated: ${setting} is now ${value} (Note: Changes might require a bot restart to take effect)`, ephemeral: true });
    }
};
