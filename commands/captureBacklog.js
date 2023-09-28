const fs = require('fs');
const path = require('path');

module.exports = {
  data: {
    name: 'captureBacklog',
    description: 'Captures the backlog of the current Discord channel',
  },
  async execute(interaction) {
    await interaction.deferReply();

    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 100 }); // Fetch last 100 messages
    const logsDir = path.join(__dirname, '../logs');
    const dateTime = Date.now();
    const logFile = path.join(logsDir, `channel-${dateTime}.txt`);

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    let backlogData = '';
    messages.forEach((message) => {
      backlogData += `[${message.createdAt}] ${message.author.tag}: ${message.content}\n`;
    });

    fs.writeFile(logFile, backlogData, 'utf8', (err) => {
      if (err) {
        console.error(err);
        return interaction.followUp('An error occurred while saving the backlog.');
      }
      interaction.followUp(`Backlog saved to ${logFile}`);
    });
  },
};