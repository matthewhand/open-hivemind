
# Discord Python Executor Bot


A Discord bot that allows users to execute Python code within a Discord server. This bot is designed to provide a convenient way to run Python code snippets, making it a valuable tool for developers, educators, and Python enthusiasts.


## Features


- **Execute Python Code:** Users can execute Python code by sending messages in a specific format.

- **Permission Control:** The bot can be configured to allow code execution only by specific users or roles.

- **Safe Execution Environment:** The bot uses a controlled environment to execute the code, minimizing security risks.


## Installation


1. Clone the repository.

2. Install the required dependencies using `npm install`.

3. Configure the environment variables as described in the `.env.example` file.

4. Start the bot using `npm start`.


## Usage


Users can execute Python code by sending a message in the following format:

````
pybot

```python

import datetime

print("Hello from Discord Bot! Current date and time:", datetime.datetime.now())
```
````

The bot will execute the code and respond with the output.


## Logging


The bot uses [Winston](https://github.com/winstonjs/winston) for logging. You can configure the logging level and format as needed.


## Docker Support
To run the bot using Docker, simply build the Docker image using the provided Dockerfile.
```
docker build -t discord-python-executor-bot .
```
Then run the Docker container:
```
docker run -e DISCORD_TOKEN=<Your-Token> -e GUILD_ID=<Your-Guild-ID> -e CLIENT_ID=<Your-Client-ID> discord-python-executor-bot

```
Replace `<Your-Token>`, `<Your-Guild-ID>`, and `<Your-Client-ID>` with the appropriate values from the Discord Developer Portal.
The Guild ID (server ID) can be obtained by right-clicking on the server.
You can also specify the following environment variables:
- `ALLOWED_USERS`: Comma-separated list of user IDs that are allowed to execute code.
- `PORT`: The port number on which the bot will listen for incoming connections.

For more details, refer to the [Dockerfile](Dockerfile) in the repository.




## Contributing


Contributions are welcome! Feel free to open issues or submit pull requests.


## License


This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

