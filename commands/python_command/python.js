const { exec } = require('child_process');

module.exports = {
  data: {
    name: 'python',
    description: 'Execute Python code',
  },
  async execute(interaction) {
    const code = interaction.options.getString('code'); // Assuming the code is passed as a string option

    // Sanitize the code if necessary

    exec(`python -c "${code}"`, (error, stdout, stderr) => {
      if (error) {
        interaction.reply(`Error executing Python code:\nExit Code: ${error.code}\nStderr: ${stderr}\nStdout: ${stdout}`);
        return;
      }
      interaction.reply(`Execution Successful:\nExit Code: 0\nStdout: ${stdout}\nStderr: ${stderr}`);
    });
  },
};
