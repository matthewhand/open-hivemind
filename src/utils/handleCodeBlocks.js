const { extractPythonCodeBlocks, executePythonCode, isUserAllowed, logger } = require('./utils');

const handleCodeBlocks = async (message, userId) => {
    const codeBlocks = extractPythonCodeBlocks(message.content);
    if (!codeBlocks) {
        logger.info('No Python code blocks found');
        return;
    }
      
    if (!isUserAllowed(userId)) {
        message.reply('You do not have permission to execute this command.');
        return;
    }

    codeBlocks.forEach((codeBlock) => {
        const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
        executePythonCode(code, message);
    });
};

module.exports = handleCodeBlocks;
