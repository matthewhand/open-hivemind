const { exec } = require('child_process');

module.exports = {
  data: {
    name: 'python',
    description: 'Execute Python code',
    options: [
      {
        name: 'code',
        type: 'STRING',
        description: 'The Python code to execute',
        required: true,
      },
    ],
  },
  async execute(interaction) {
    const code = interaction.options.getString('code');

    exec(`python -c "${code}"`, (error, stdout, stderr) => {
      if (error) {
        interaction.reply(`Error executing code: ${error.message}`);
        return;
      }
      if (stderr) {
        interaction.reply(`Stderr: ${stderr}`);
        return;
      }
      interaction.reply(`Stdout: ${stdout}`);
    });
  },
};
