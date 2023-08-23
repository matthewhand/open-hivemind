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
        interaction.reply(`Query result: ${response.data}`);
      })
      .catch((error) => {
        interaction.reply(`Error querying database: ${error.message}`);
      });
  },
};
