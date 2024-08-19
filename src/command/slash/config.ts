import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMemberRoleManager } from 'discord.js';
import { isUserAllowed, isRoleAllowed } from '@utils/permissions';
import configManager from '@config/ConfigurationManager';

// Allowed users and roles from environment variables
const allowedUsers = process.env.BOT_ALLOWED_USERS ? process.env.BOT_ALLOWED_USERS.split(',') : [];
const allowedRoles = process.env.BOT_ALLOWED_ROLES ? process.env.BOT_ALLOWED_ROLES.split(',') : [];
const nonOverridableEnvVars = new Set(['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID']);

export const configCommand = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Updates or saves the bot configuration.')
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Updates a configuration setting.')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('The configuration setting to update')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The new value for the setting')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('save')
                .setDescription('Saves the current configuration to the file.')),

    async execute(interaction: CommandInteraction): Promise<void> {
        const userId = interaction.user.id;

        // Guard: Ensure roles exist and handle accordingly
        const roles = interaction.member?.roles;
        const userRoles = Array.isArray(roles) ? roles : (roles as GuildMemberRoleManager)?.cache.map(role => role.id) || [];

        // Debug: Log user ID and roles for permission checking
        console.debug('Executing config command:', { userId, userRoles });

        if (!isUserAllowed(userId, allowedUsers) && !isRoleAllowed(userRoles, allowedRoles)) {
            await interaction.reply({ content: 'You do not have permission to execute this command.', ephemeral: true });
            return;
        }

        // Handle 'update' subcommand
        if (interaction.options.getSubcommand() === 'update') {
            const setting = interaction.options.getString('setting');
            const value = interaction.options.getString('value');

            // Guard: Ensure setting and value are defined
            if (!setting || !value) {
                await interaction.reply({ content: 'Invalid setting or value provided.', ephemeral: true });
                return;
            }

            // Debug: Log the setting being updated
            console.debug('Updating configuration:', { setting, value });

            if (nonOverridableEnvVars.has(setting)) {
                await interaction.reply({ content: \`The setting '\${setting}' cannot be overridden.\`, ephemeral: true });
                return;
            }

            // Update the configuration
            configManager.setConfig(setting, value);
            await interaction.reply({ content: \`Configuration updated: \${setting} is now \${value}.\`, ephemeral: true });
        } else if (interaction.options.getSubcommand() === 'save') {
            // Save the current configuration to file
            configManager.saveConfig();
            await interaction.reply({ content: 'Configuration saved successfully.', ephemeral: true });
        }
    }
};
