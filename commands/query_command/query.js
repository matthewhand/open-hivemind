const axios = require('axios');

module.exports = {
  data: {
    name: 'query',
    description: 'Query a database via HTTP',
    options: [
      {
        name: 'querystring',
        type: 'STRING',
        description: 'The query string to send',
        required: true,
      },
    ],
  },
  async execute(interaction) {
    const queryUrl = process.env.QUERY_URL;
    const queryString = interaction.options.getString('querystring');
    const encodedQueryString = encodeURIComponent(queryString);
    const fullUrl = `${queryUrl}?query=${encodedQueryString}`;

    axios.get(fullUrl)
      .then((response) => {
        // Check if the response data is JSON
        if (typeof response.data === 'object' && response.data !== null) {
          // Return the value for the key 'answer' if it exists
          const answer = response.data.answer;
          if (answer) {
            interaction.reply(`Query result: ${answer}`);
          } else {
            interaction.reply(`Query result does not contain the key 'answer'`);
          }
        } else {
          interaction.reply(`Query result: ${response.data}`);
        }
      })
      .catch((error) => {
        interaction.reply(`Error querying database: ${error.message}`);
      });
  },
};
