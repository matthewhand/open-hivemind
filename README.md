
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


```

pybot

...

```python

import datetime

print("Hello from Discord Bot! Current date and time:", datetime.datetime.now())

```


The bot will execute the code and respond with the output.


## Logging


The bot uses [Winston](https://github.com/winstonjs/winston) for logging. You can configure the logging level and format as needed.


## Docker Support


You can run the bot inside a Docker container. Here's an example of a Dockerfile you can use:


```Dockerfile

FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "index.js" ]

```


Build and run the Docker container using the following commands:


```bash

docker build -t discord-python-executor-bot .

docker run -e DISCORD_TOKEN=your_token_here discord-python-executor-bot

```


## Contributing


Contributions are welcome! Feel free to open issues or submit pull requests.


## License


This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

