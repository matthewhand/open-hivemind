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
  // Check if the message is from a guild and starts with 'pybot'
  if (message.guild && message.content.toLowerCase().startsWith('pybot')) {
    const userId = message.author.id;
    const guild = message.guild;
    const member = message.member;

    // Check if the member is the owner of the guild or an allowed user
    if ((guild.ownerId !== member.id) && (!allowedUsers.includes(userId))) {
      return message.reply('You do not have permission to execute this command.');
    }

    // Extract all Python code blocks from the message
const codeBlocks = message.content.match(/```python\n?([\s\S]+?)```/g);
if (!codeBlocks) return;

codeBlocks.forEach((codeBlock) => {
  // Extract the Python code from the code block
  const code = codeBlock.replace(/```python\n?|```/g, '');
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
  }
});

client.login(token);

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
