# Discord LLM Interaction Bot

A sophisticated Discord bot leveraging cutting-edge language models, image analysis, and diverse AI services, designed to enrich user interaction within Discord communities.

## 🌟 Features

- **Advanced LLM AI Interaction**: Seamlessly engage with state-of-the-art language models for dynamic, context-aware text responses, offering users a rich conversational experience.
- **Comprehensive Image Analysis**: Utilize advanced ML models from Replicate and the LLaVA 13B model for detailed image descriptions and insights, supporting both pay-as-you-go and free usage models.
- **Integrated AI Services**:
  - **Perplexity Integration**: Leverage the Perplexity AI for deep, nuanced conversations and information retrieval.
  - **Quivr Integration**: Access Quivr's diverse AI functionalities for responsive and intelligent data processing.
  - **Flowise Integration**: Connect with Flowise for efficient workflow automation and handling complex AI-driven queries.
- **Secure Python Code Execution**: Execute Python code blocks within Discord securely, with permissions and safety checks in place.
- **Enhanced User Permissions & Security**: Configure command access based on user roles or specific permissions, ensuring operational security.
- **Dynamic Configuration**: Tailor system prompts and settings for varied models and interaction scenarios via dynamic configuration.
- **Robust Moderation System**: A sophisticated AI-assisted voting system for server moderation, enabling informed decision-making processes.
- **Automated Resilience**: Built-in error handling and auto-restart mechanisms ensure continuous bot operation with minimal downtime.
- **Versatile Hosting Options**: Deploy on cloud platforms like OCI, Render.com, and Back4App, or opt for on-premises hosting across different OS environments.
- **Monitoring & Diagnostics**: Employ `/health` and `/uptime` endpoints to monitor the bot's health and operational status.

## 🚀 Deployment

### Prerequisites

- Node.js (version 16.x or higher recommended)
- Docker (for containerized deployment)
- A Discord bot token and client ID from the Discord Developer Portal

### Environment Setup

1. Create a `.env` file at the project root, following the template provided in `.env.sample`.

### Deployment Guide

#### Localhost

1. Clone the repository to your local machine.
2. Install dependencies using `npm install`.
3. Configure your `.env` file with the necessary environment variables.
4. Start the bot with `npm start`.

#### Docker

1. Ensure your `.env` file is set up with required configurations.
2. From the project's root directory, run `docker-compose up --build -d` to initiate the build and start the bot in a Docker container.
3. Monitor bot activity via `docker-compose logs -f`.

#### Cloud Deployment

For deploying on cloud platforms, follow the setup instructions provided by your cloud hosting service. Detailed backend setup and configuration instructions can be found in [llm_backend/README.md](./llm_backend/README.md).

## 🛠 Usage

### Commands

Utilize a variety of commands in the `!command` format, such as `!perplexity` and `!quivr`, to access the bot's functionalities.

### Wakewords

Initiate AI-driven conversations and queries using predefined wakewords, enhancing user engagement and interaction.

## 📊 Monitoring

The bot's operational status and health can be monitored through `/health` and `/uptime` endpoints, providing real-time diagnostics.

## 🔧 Development Setup

To ensure high-quality contributions and maintain code standards, we've integrated a validation step that combines linting and testing. This step helps identify and fix issues early in the development process, making your contributions smoother and more reliable.

### Running Tests and Linting

Before submitting your changes, please run the following command to execute both ESLint and Jest tests:

```bash
npm run validate
```

## 📄 Additional Documentation

For detailed configuration management, refer to [docs/CONFIGURATION.chatgpt.md](./docs/CONFIGURATION.chatgpt.md).

For license information, refer to [docs/LICENSE.chatgpt.md](./docs/LICENSE.chatgpt.md).
