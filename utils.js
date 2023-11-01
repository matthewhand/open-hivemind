const { exec } = require('child_process');
const fs = require('fs');
const logger = require('./logger');

const allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
const allowedRoles = process.env.ALLOWED_ROLES ? process.env.ALLOWED_ROLES.split(',') : [];

const isUserAllowed = (userId, allowedUsersList = allowedUsers) => {
  return allowedUsersList.includes(userId);
};

const isRoleAllowed = (userRoles, allowedRolesList = allowedRoles) => {
  return userRoles.some(role => allowedRolesList.includes(role));
};

const extractPythonCodeBlocks = content => content.match(/\`\`\`python\n?([\s\S]+?)\`\`\`/g);

const executePythonCodeBlocks = async (message, allowedUsersList = allowedUsers, allowedRolesList = allowedRoles) => {
  const codeBlocks = extractPythonCodeBlocks(message.content);
  if (!codeBlocks) {
    logger.info('No Python code blocks found');
    return;
  }

  const userId = message.author.id;
  const member = await message.guild.members.fetch(userId);
  const userRoles = member.roles.cache.map(role => role.id);

  if (!isUserAllowed(userId, allowedUsersList) && !isRoleAllowed(userRoles, allowedRolesList)) {
    message.reply('You do not have permission to execute this command.');
    return;
  }

  codeBlocks.forEach((codeBlock) => {
    const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
    executePythonCode(code, message);
  });
};

const executePythonCode = async (code, message) => {
  const fileName = `tmp_${Date.now()}.py`;
  fs.writeFileSync(fileName, code);
  exec(`python ${fileName}`, (error, stdout, stderr) => {
    if (error) {
      message.reply(`Error executing code: ${error.message}`);
      return;
    }
    if (stderr) {
      message.reply(`Stderr: ${stderr}`);
      return;
    }
    message.reply(`Stdout: ${stdout}`);
    fs.unlinkSync(fileName);
  });
};

module.exports = { extractPythonCodeBlocks, executePythonCode, isUserAllowed, isRoleAllowed, logger };
