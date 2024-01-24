# Discord LLM Interaction Bot

A versatile Discord bot integrating advanced language models, image analysis, and additional AI services for a comprehensive experience in Discord servers.

## 🌟 Features

- **LLM AI Interaction**: Engage with various language models for intelligent and dynamic text responses.
- **Replicate Image Analysis**: Analyze and describe images using machine learning models from Replicate (pay-as-you-go).
- **Perplexity Integration**: Utilize the Perplexity language model for detailed and nuanced conversations.
- **Quivr Integration**: Access Quivr's AI capabilities for a range of responses and data processing.
- **Flowise Integration**: Connect to Flowise for workflow automation and complex queries.
- **Python Code Execution**: Safely run Python code blocks directly in Discord.
- **User Permissions & Security**: Restrict command usage to specific users or roles.
- **Dynamic System Setting**: Dynamically configure system prompts for different models and scenarios.
- **Monitoring & Health Checks**: Utilize `/health` and `/uptime` endpoints for monitoring bot status.
- **Hosting Flexibility**: Host on cloud platforms (OCI, Render.com, Back4App) or on-premises (Linux, Windows).
- **Image Analysis with LLaVA 13B (Replicate)**: Analyze images with LLaVA 13B model (pay-per-use).
- **DIY RAG Endpoint (Modal)**: Utilize custom RAG endpoints hosted on Modal's free tier.
- **Advanced Moderation System**: Implement a comprehensive voting system for server moderation with AI-assisted decision-making.
- **Automated Exception Handling & Restart**: In-built resilience with automated error notification and scheduled restarts.

[ ] TODO: Integrate free Hugging Face LLaVA model for image analysis.

## 🚀 Deployment

### Prerequisites

- Node.js
- Docker (optional)
- Discord bot token and client ID

### Environment Setup

Create a `.env` file with necessary variables as detailed in `.env.sample`.

### Deployment Options

#### Localhost

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up `.env` with required variables.
4. Run the bot: `npm start`.

#### Docker

1. Set up `.env`.
2. Navigate to the root directory of the project.
3. Run Docker Compose to build and start the container: `docker-compose up --build -d`.
4. Optionally, follow the logs: `docker-compose logs -f`.

#### Cloud Services

Deploy using provided instructions by your cloud service provider, ensuring the correct setting of environment variables. For detailed guidance on setting up and configuring the backend for cloud services, please refer to the [README in the llm_backend folder](./llm_backend/README.md).

## 🛠 Usage

### Text Commands

Invoke various functionalities using `!command` format, e.g., `!perplexity`, `!quivr`.

### Wakewords

Engage in conversations using designated wakewords.

## 📊 Monitoring

Use `/health` and `/uptime` endpoints for bot's operational status.

## 🤝 Contributing

Contribute via issues or pull requests. Refer to `CONTRIBUTING.md` for guidelines.

## 📝 License

MIT License. See [LICENSE](LICENSE).
