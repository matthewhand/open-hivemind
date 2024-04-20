const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

/**
 * Command to mute a specified user in a Discord server.
 * Usage: !mute @user
 */
class MuteCommand extends ICommand {
    constructor() {
        super();
        this.name = 'mute';
        this.description = 'Mutes a specified user.';
    }

    /**
     * Executes the mute command using the provided message context and arguments.
     * @param {Object} message - The Discord message object that triggered the command.
     * @param {string[]} args - The arguments provided with the command.
     * @returns {Promise<CommandResponse>} - The result of the command execution.
     */
    async execute(args) {
        const message = args.message;
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return { success: false, message: "Please mention a user to mute." };
        }

        const muteRole = message.guild.roles.cache.find(role => role.name === "Muted");
        if (!muteRole) {
            return { success: false, message: "Mute role not found on this server." };
        }

        const member = message.guild.members.cache.get(targetUser.id);
        await member.roles.add(muteRole);
        logger.info(`MuteCommand: ${targetUser.tag} has been muted.`);
        return { success: true, message: `${targetUser.tag} has been muted.` };
    }
}

module.exports = MuteCommand;  // Correct: Exports the class for dynamic instantiation
