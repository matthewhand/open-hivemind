# User Guide

This guide provides a detailed walkthrough of the Open-Hivemind WebUI, organized by the menu structure you see in the application.

## Overview

### [Dashboard / Overview](/admin/overview)
The central hub for monitoring your bot ecosystem.
*   **Bot Status**: View real-time status of all running bots (Online, Offline, Error).
*   **Recent Activity**: See a feed of recent interactions and events.
*   **System Health**: Quick glance at CPU, memory, and uptime.

## Configuration

### [LLM Providers](/admin/integrations/llm)
Manage connections to Large Language Model providers.
*   **Add Provider**: Configure API keys and endpoints for services like OpenAI, Anthropic, Google Gemini, or local models (via Ollama/vLLM).
*   **Model Selection**: Choose default models for different tasks (chat, summarization, etc.).
*   **Test Connection**: Verify your API credentials are working.

### [Message Platforms](/admin/integrations/message)
Connect your bots to messaging services.
*   **Discord**: Add your Discord Bot Token and configure server settings.
*   **Slack**: Set up your Slack App Token and Bot Token.
*   **Mattermost**: Configure your Mattermost URL and Bot Token.
*   **Status**: Check connection health for each platform.

### [MCP Servers](/admin/mcp/servers)
Manage Model Context Protocol (MCP) servers to extend bot capabilities with tools.
*   **Add Server**: Connect to an MCP server by providing its URL and API key.
*   **Status**: Monitor connection status (Running/Stopped).
*   **Tools**: View available tools provided by each server.

![MCP Servers List](docs/screenshots/mcp-servers-list.png)

*   **Configuration**: Add or edit server details including name and URL.

![Add MCP Server Modal](docs/screenshots/mcp-add-server-modal.png)

### [Bots](/admin/bots)
Create and manage individual bot instances.
*   **Create Bot**: Define a new bot with a unique name.
*   **Link Persona**: Assign a specific personality to the bot.
*   **Assign Providers**: Choose which LLM and Message Platform the bot uses.
*   **Active Status**: Toggle bots on or off individually.

### [Personas](/admin/personas)
Define the personality and behavior of your bots.
*   **System Prompt**: Write the core instructions that define who the bot is (e.g., "You are a helpful coding assistant").
*   **Tone & Style**: Adjust the bot's communication style (formal, casual, witty).
*   **Context**: Provide background information the bot should know.

### [Guards](/admin/guards)
Set up safety and security boundaries.
*   **Content Filters**: Block specific words or phrases.
*   **Tool Permissions**: Control which MCP tools a bot is allowed to use.
*   **Input Sanitization**: Configure rules to prevent injection attacks or malicious inputs.

## System

### [Settings](/admin/settings)
General system configuration.
*   **Rate Limits**: Adjust global message rate limits to prevent spam.
*   **Logging**: Configure log levels and retention policies.
*   **Updates**: Check for system updates.

### [Webhook](/admin/integrations/webhook)
Configure incoming webhooks for external integrations.
*   **Endpoint Management**: specific URLs to trigger bot actions from external services.
*   **Security**: Manage webhook secrets and verification.

### [Monitoring](/admin/monitoring)
Deep dive into system performance.
*   **Metrics**: detailed graphs of API usage, response times, and error rates.
*   **Logs**: Searchable real-time system logs.
*   **Health Checks**: Detailed status of all internal services and dependencies.

### [Global Defaults](/admin/configuration)
Set default behaviors for new bots.
*   **Default LLM**: The fallback provider if none is specified for a bot.
*   **Default Persona**: The base personality applied to new bots.

## AI & Analytics

### [AI Dashboard](/admin/ai/dashboard)
Visual insights into your AI usage.
*   **Token Usage**: Track token consumption across different providers.
*   **Cost Estimation**: Estimate costs based on usage.
*   **Model Performance**: Compare response times and quality across models.

### [Analytics](/admin/analytics)
Historical data and trends.
*   **Conversation Volume**: Track message volume over time.
*   **User Engagement**: See active users and interaction frequency.
*   **Topic Analysis**: (If enabled) High-level analysis of conversation topics.

### [Anomaly Detection](/admin/ai/anomalies)
Identify unusual patterns in bot behavior.
*   **Spike Detection**: Alerts for sudden increases in message volume or errors.
*   **Behavioral Drifts**: Detect if a bot starts deviating from its persona.

### [AI Assistant](/admin/ai/chat)
An internal chat interface for admins.
*   **Test Prompts**: Experiment with prompts before deploying them to bots.
*   **System Queries**: Ask the AI questions about the system configuration or logs.

## Developer

### [UI Components](/admin/showcase)
A reference for developers extending the WebUI.
*   **Component Library**: View available UI elements (buttons, inputs, cards) and their usage.
*   **Theme Preview**: Test how components look with different themes.
