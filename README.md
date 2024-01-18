# Discord LLM Interaction Bot

A versatile Discord bot that integrates advanced language models, image analysis via Replicate, and additional services like Perplexity, Quivr, and Flowise for a comprehensive AI-driven experience.

## 🌟 Features

- **LLM AI Interaction**: Utilize language models for intelligent text responses.
- **Replicate Image Analysis**: Analyze images using machine learning models.
- **Perplexity Integration**: Leverage the Perplexity language model for complex conversations.
- **Quivr Integration**: Access Quivr for a diverse range of AI responses.
- **Flowise Integration**: Connect to Flowise for specialized data processing.
- **Python Code Execution**: Run Python code blocks securely.
- **User Permissions**: Restrict access to specific users or roles.
- **Dynamic System Setting**: Dynamically set system prompts for different models.
- **Logging**: Detailed logs for monitoring interactions and troubleshooting.

## 🚀 Deployment

### Prerequisites

- Node.js
- Docker (optional for Docker deployment)
- A Discord bot token and client ID

### Environment Variables

Configure the following environment variables in a `.env` file:

- `DISCORD_TOKEN`: Your Discord bot token.
- `GUILD_ID`: Your Discord server ID.
- `CLIENT_ID`: Your Discord client ID.
- `CHANNEL_ID`: ID of the channel where the bot operates.
- LLM, Perplexity, Quivr, Flowise, and Replicate configurations (see `.env.sample` for more details).

### Option a: Deploy to localhost

1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file with necessary environment variables.
4. Start the bot: `npm start`.

### Option b: Deploy to localhost - Docker

1. Create a `.env` file with necessary variables.
2. Build the Docker image: `docker build -t discord-llm-bot .`
3. Run the container: `docker run --env-file .env discord-llm-bot`

### Option c: Deploy to a cloud service

Follow the specific instructions provided by the cloud service to deploy the application. Ensure environment variables are correctly set in the cloud environment.

## 🛠 Usage

### Text Commands

- `!analyse`, `!analyze`, `!llava`: Trigger image analysis.
- `!perplexity`: Engage with Perplexity LLM.
- `!quivr`: Use Quivr for AI responses.
- `!flowise <action>`: Send queries to Flowise.
- `!python`, `!execute`: Execute Python code.

### Wakewords

Initiate conversations with the bot using wakewords specified in the environment variables.

## 📊 Monitoring

Endpoints `/health` and `/uptime` return HTTP 200 for uptime monitoring.

## 🤝 Contributing

Contributions are welcome. Open issues or submit pull requests to improve the bot.

## 📝 License

This project is under the MIT License. See [LICENSE](LICENSE) for more information.

