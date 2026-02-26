# Open Hivemind User Guide

Welcome to the Open Hivemind User Guide. This document provides an overview of the key features and how to use them.

## Live Chat Monitor

The Live Chat Monitor allows administrators to observe conversations across all active bots in real-time. This is useful for monitoring bot performance, debugging responses, and ensuring quality interactions.

![Live Chat Monitor](screenshots/chat-monitor.png)

### Features

-   **Bot List**: View all configured bots and their connection status (Online/Offline) in the sidebar.
-   **Conversation History**: Select a bot to view its recent chat history with users.
-   **Real-time Updates**: Use the Refresh button to fetch the latest messages.
-   **Read-Only Mode**: Currently, the interface is read-only. Sending messages directly from the admin panel is disabled to prevent interference with automated flows.

### How to Use

1.  Navigate to the **Chat** section in the admin sidebar.
2.  Click on a bot from the list on the left.
3.  The main view will load the recent message history for that bot.
4.  Click the **Refresh** icon in the header to update the view with new messages.

## System Configuration

The System Configuration page allows administrators to manage global settings, including instance details, localization, logging, system limits, and health monitoring.

![General Settings](screenshots/settings-general.png)

### Features

-   **Instance Information**: Configure the display name and description of your Open Hivemind instance.
-   **Localization**: Set the timezone and language preferences.
-   **Logging & Notifications**: Control system logging levels and notification preferences.
-   **System Limits**: Adjust maximum concurrent bots and response timeouts to manage resource usage.
-   **Health & Monitoring**: Enable and configure periodic health checks for external services.
-   **Advanced Settings**: Unlock experimental features and granular configurations.

### How to Use

1.  Navigate to the **Settings** section in the admin sidebar.
2.  Adjust the settings as needed.
3.  Click **Save Settings** to apply changes.

## Personas Management

The Personas (Beta) feature allows you to define distinct AI personalities and system prompts that can be assigned to one or more bots. This centralizes the management of bot behaviors.

![Personas Management](screenshots/personas-page.png)

### Features

-   **Persona Library**: Create, edit, and delete custom personas. Built-in personas (like "Technical Assistant") are read-only but can be cloned.
-   **System Prompts**: Define the core instructions (System Prompt) for the AI.
-   **Bulk Assignment**: Assign a persona to multiple bots simultaneously.
-   **Real-time Updates**: Changes to a persona (e.g., updating the prompt) are immediately reflected across all assigned bots.

### Workflow

1.  **Create a Persona**: Click the **Create Persona** button.
2.  **Define Behavior**: Enter a name, description, and the **System Prompt** (e.g., "You are a helpful assistant...").
3.  **Assign Bots**: In the "Assign to Bots" section, select the bots that should use this persona.
4.  **Save**: Click **Create Persona** (or **Save Changes**) to apply. The selected bots will now use the new system prompt.

## Bot Management

The Bot Management section allows you to create and configure AI assistants. The simplified creation flow helps you quickly deploy new bots to platforms like Discord, Slack, Mattermost, and Telegram.

![Bot Creation Page](screenshots/bot-create-page.png)

### Creating a New Bot

1.  Navigate to **Bots** in the sidebar and click **Create Bot**.
2.  **Name & Description**: Use the AI Assist button to generate creative names and descriptions.
3.  **Platform Selection**: Choose your target messaging platform from the visual grid (Discord, Slack, etc.).
4.  **Persona**: Select a persona to define the bot's personality. A preview card will show you the persona's details.
5.  **LLM Provider**: Choose which AI model provider to use, or stick with the system default.
6.  Click **Create Bot** to finalize.
