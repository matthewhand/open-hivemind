# Discord LLM Interaction Bot

A Discord bot that combines the capabilities of an LLM-based language model for text-based interactions and Replicate for image analysis. This bot is ideal for developers, educators, and anyone interested in exploring AI-based interactions within Discord.

## Features

- **LLM AI Interaction**: Engage with an advanced language model to get text-based responses to queries or execute instructions.
- **Replicate Image Analysis**: Upload an image and get descriptive and insightful analysis based on machine learning models.
- **User Permissions**: Limit interactions to specific users or roles for controlled access.
- **Dynamic System Setting**: Set the system prompt for LLM queries dynamically using a slash command.
- **Python Code Execution**: Run Python code blocks securely when required.
- **Logging**: Detailed logging to monitor bot interactions and diagnose issues.

## Deployment

### Environment Variables

[Refer to `.env.sample` for explanations and sample values.]

### Option a: Deploy to Render

You can deploy this project to Render by clicking the button below:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/matthewhand/discord-llm-bot)
1. Click the \"Deploy to Render\" button.
2. Follow the on-screen prompts to configure your Discord bot.
3. Once deployed, go to the service dashboard for further configuration and monitoring

### Option b: Deploy to localhost

1. Clone this repository.
2. Run `npm install`.
3. Create a `.env` file at the root of your project and populate it with necessary environment variables.
4. Start the bot with `npm start`.

### Option c: Deploy to localhost - Docker

First, create a `.env` file at the root directory of your project. Copy the `.env.sample` as a starting point.

Build the Docker image:

````
docker build -t discord-llm-bot .
````

Run the Docker container:

````
docker run --env-file .env discord-llm-bot
````

This will load all the environment variables defined in your `.env` file into your Docker container.


## Usage

### LLM AI Interaction

To engage with the LLM, mention the trigger word along with your query or instruction:

````
!execute

```python
print('Hello, world!')
```
````

The bot will respond with the output.

### Replicate Image Analysis

To analyze an image, simply upload it to the designated channel. The bot will send the image for analysis and return the results.

````
Upload an image to the channel with message !analyse
````

The bot will provide analysis based on the machine learning model specified.

## Monitoring

The `/health` and `/uptime` endpoints return HTTP/200 for monitoring.

## Built with ChatGPT

This entire project was built using ChatGPT. Helper utilities used to upload to Github using the Noteable ChatGPT Plugin can be found in the `notebooks/` directory.

## Contributing

Feel free to contribute by opening issues or submitting pull requests.

## License

This project is under the MIT License. See [LICENSE](LICENSE) for more information.
