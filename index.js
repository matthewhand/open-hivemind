const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');
const { registerCommands, handleCommands, commandExecutors } = require('./commands');
const { startWebhookServer } = require('./webhook');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');

// Register Discord commands
registerCommands(clientId, token, guildId);

// Handle Discord commands
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });
handleCommands(client);
client.on('messageCreate', async (message) => {
  console.log('Message received:', message.content); // Log the received message

  // Check if the message is from a guild and contains 'pybot'
  if (message.guild && message.content.toLowerCase().includes('pybot')) {
    console.log('Message contains "pybot"'); // Log that the message contains "pybot"

    const userId = message.author.id;
    const guild = message.guild;
    const member = message.member;

    // Check if the member is the owner of the guild or an allowed user
    if ((guild.ownerId !== member.id) && (!allowedUsers.includes(userId))) {
      console.log('User does not have permission'); // Log permission check
      return message.reply('You do not have permission to execute this command.');
    }

    // Extract all Python code blocks from the message
    const codeBlocks = message.content.match(/\`\`\`python\n?([\s\S]+?)\`\`\`/g);
    if (!codeBlocks) {
      console.log('No Python code blocks found'); // Log if no code blocks are found
      return;
    }

    console.log('Found Python code blocks:', codeBlocks); // Log the found code blocks

    codeBlocks.forEach((codeBlock) => {
      // Extract the Python code from the code block
      const code = codeBlock.replace(/\`\`\`python\n?|\`\`\`/g, '');
      const escapedCode = code.replace(/"/g, '\\"'); // Escape double quotes

      console.log(`Executing Python code: ${escapedCode}`); // Print the code argument

      // Execute the Python code
      exec(`python -c "${escapedCode}"`, (error, stdout, stderr) => {
        if (error) {
          message.reply(`Error executing code: ${error.message}`);
          return;
        }
        if (stderr) {
          message.reply(`Stderr: ${stderr}`);
          return;
        }
        message.reply(`Stdout: ${stdout}`);
      });
    });
  } else {
    console.log('Message does not contain "pybot"'); // Log if the message does not contain "pybot"
  }
});

client.login(token);

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
