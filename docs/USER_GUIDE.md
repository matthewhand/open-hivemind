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

## Creating a New Bot

The Bot Creation page provides a streamlined interface for deploying new AI agents.

![Create Bot Page](screenshots/bot-create-page.png)

### Features

-   **Visual Platform Selection**: Choose your messaging platform (Discord, Slack, Mattermost, Telegram) using an intuitive grid interface.
-   **Persona Preview**: Select a persona and instantly see its description to ensure the right personality is applied.
-   **LLM Configuration**: Easily select an LLM provider or use the system default, with clear visibility into what the default entails.
-   **AI Assistance**: Use the built-in AI tools to generate creative names and descriptions for your bot.

### How to Use

1.  Navigate to the **Bots** section in the admin sidebar.
2.  Click **Create Bot** (or navigate to `/admin/bots/create`).
3.  Fill in the bot's name and description.
4.  Select the desired messaging platform by clicking its card.
5.  Choose a persona from the dropdown and review its details in the preview card.
6.  Select an LLM provider or stick with the system default.
7.  Click **Create Bot** to deploy.

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
