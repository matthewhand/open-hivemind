// commands/python.js
const { executePythonCode, extractPythonCodeBlocks, isUserAllowed } = require('../utils/utils');
const Command = require('../utils/Command');
const logger = require('../utils/logger');

class PythonCommand extends Command {
    constructor() {
        super('python', 'Executes Python code blocks. Usage: !python [code]');
    }

    async execute(message) {
        const userId = message.author.id;
        const member = await message.guild.members.fetch(userId);
        const userRoles = member.roles.cache.map(role => role.id);

        // Check if the user is allowed to execute Python code
        if (!isUserAllowed(userId, userRoles)) {
            message.reply('You do not have permission to execute Python code.');
            return;
        }

        // Extract Python code blocks from the message
        const codeBlocks = extractPythonCodeBlocks(message.content);
        if (!codeBlocks || codeBlocks.length === 0) {
            message.reply('No Python code blocks found.');
            return;
        }

        // Execute each Python code block found in the message
        codeBlocks.forEach(codeBlock => {
            const code = codeBlock.replace(/```(python)?|```/gi, '').trim();
            logger.debug(`Executing Python code: ${code.substring(0, 50)}...`);
            executePythonCode(code, message).catch(error => {
                logger.error(`Error executing Python code: ${error.message}`);
                message.reply('An error occurred while executing Python code.');
            });
        });
    }
}

module.exports = new PythonCommand();
