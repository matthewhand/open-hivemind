const { executePythonCode, extractPythonCodeBlocks, isUserAllowed } = require('../utils/utils');

async function handlePythonRequest(message) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId);
    const userRoles = member.roles.cache.map(role => role.id);

    if (!isUserAllowed(userId, userRoles)) {
        message.reply('You do not have permission to execute Python code.');
        return;
    }

    const codeBlocks = extractPythonCodeBlocks(message.content);
    if (!codeBlocks) {
        message.reply('No Python code blocks found.');
        return;
    }

    codeBlocks.forEach(codeBlock => {
        const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
        executePythonCode(code, message);
    });
}

module.exports = { handlePythonRequest };

