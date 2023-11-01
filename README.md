# Discord LLM Interaction Bot

A Discord bot that interacts with an LLM-based language model to provide responses or execute instructions based on user input. Ideal for developers, educators, and anyone interested in exploring AI-based interactions within Discord.

## Features

- **AI Interaction**: Engage with an advanced language model to get responses to queries or instructions.
- **User Permissions**: Limit interactions to specific users or roles for controlled access.
- **Dynamic System Setting**: Set the system for LLM queries dynamically using a slash command.
- **Python Code Execution**: Run Python code blocks securely when required.
- **Logging**: Detailed logging to monitor bot interactions and diagnose issues.

## Installation

1. Clone this repository.
2. Run `npm install`.
3. Set up the environment variables as per your Cloudflare and Discord settings.
4. Start the bot with `npm start`.

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token.
- `GUILD_ID`: The ID of your Discord server.
- `CLIENT_ID`: Your Discord client ID.
- `ALLOWED_USERS`: Comma-separated list of user IDs allowed to execute code.
- `TRIGGER_WORD`: Custom word to trigger interactions (defaults to 'pybot').
- `LLM_API_KEY`: Your LLM API Key for authorized access to the LLM server.
- `LLM_URL`: The URL of your Cloudflare worker for LLM interactions.
- `LLM_SYSTEM`: The default system for LLM queries (e.g., 'mistral-7b-instruct').
- `PORT`: Port for the bot's web server (default is 3000).

## Usage

### AI Interaction
To engage with the LLM, simply mention the trigger word along with your query or instruction:

````
pybot

```python
print('Hello, world!')
```
````


The bot will respond with the output.

## Monitoring

The `/health` and `/uptime` endpoints return HTTP/200 for monitoring.


## Docker Support

First, create a `.env` file at the root directory of your project. This file should contain all the environment variables you'll be using. You can copy the `.env.sample` as a starting point.

Build the Docker image:

```
docker build -t discord-llm-bot .
```

Run the Docker container:

```
docker run --env-file .env discord-llm-bot
```

This will pick up all the environment variables defined in your `.env` file and pass them to your Docker container.



## Built with ChatGPT

This entire project was built using ChatGPT.  Helper utilities used to upload to Github using Noteable ChatGPT Plugin can be found in notebooks/.

## Contributing

Feel free to contribute by opening issues or submitting pull requests.

## License

This project is under the MIT License. See [LICENSE](LICENSE) for more information.
