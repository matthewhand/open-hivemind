# Discord Python Executor Bot

A Discord bot that executes Python code in a secure and controlled environment. Ideal for developers, educators, and Python enthusiasts.

## Features

- **Code Execution**: Run Python code blocks securely.
- **User Permissions**: Limit code execution to specific users or roles.
- **Logging**: Detailed logging using Winston.

## Installation

1. Clone this repository.
2. Run `npm install`.
3. Set up the environment variables.
4. Start the bot with `npm start`.

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token.
- `GUILD_ID`: The ID of your Discord server.
- `CLIENT_ID`: Your Discord client ID.
- `ALLOWED_USERS`: Comma-separated list of user IDs allowed to execute code.
- `PORT`: Port for the bot's web server (default is 3000).

## Usage

To execute Python code, send a message formatted as follows:


```
pybot

```python

print('Hello, world!')
```


The bot will respond with the output.

## Monitoring

The `/health` endpoint returns HTTP/200 for monitoring.

## Docker Support

Build the Docker image:

```
docker build -t discord-python-executor-bot .
```

Run the Docker container:

```
docker run -e DISCORD_TOKEN=<Your-Token> -e GUILD_ID=<Your-Guild-ID> -e CLIENT_ID=<Your-Client-ID> discord-python-executor-bot
```

## Contributing

Feel free to contribute by opening issues or submitting pull requests.

## License

This project is under the MIT License. See [LICENSE](LICENSE) for more information.