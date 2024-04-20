const { executePythonCode, extractPythonCodeBlocks, isUserAllowed } = require('../../utils/utils');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');

/**
 * Command to execute Python code blocks submitted through Discord messages.
 * Usage: !python [code]
 */
class PythonCommand extends ICommand {
    constructor() {
        super();
        this.name = 'python';
        this.description = 'Executes Python code blocks. Usage: !python [code]';
    }

    /**
     * Executes the Python command using provided arguments and context.
     * @param {Object} args - The arguments and context for the command.
     * @returns {Promise<CommandResponse>} - The result of the command execution.
     */
    async execute(args) {
        const message = args.message;
        const userId = message.author.id;
        const member = await message.guild.members.fetch(userId);
        const userRoles = member.roles.cache.map(role => role.id);

        if (!isUserAllowed(userId, userRoles)) {
            return { success: false, message: 'You do not have permission to execute Python code.' };
        }

        const codeBlocks = extractPythonCodeBlocks(message.content);
        if (!codeBlocks.length) {
            return { success: false, message: 'No Python code blocks found.' };
        }

        for (const codeBlock of codeBlocks) {
            const code = codeBlock.replace(/```(python)?|```/gi, '').trim();
            try {
                logger.debug(`Executing Python code: ${code.substring(0, 50)}...`);
                await executePythonCode(code, message);
            } catch (error) {
                logger.error(`Error executing Python code: ${error.message}`);
                return { success: false, message: 'An error occurred while executing Python code.', error: error.toString() };
            }
        }

        return { success: true, message: 'Executed all Python code blocks successfully.' };
    }
}

module.exports = PythonCommand;  // Correct: Exports the class for dynamic instantiation
