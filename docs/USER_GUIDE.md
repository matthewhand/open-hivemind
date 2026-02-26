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

The System Configuration page provides global settings for managing the Open Hivemind instance, including instance details, localization, logging, and system limits.

![General Settings](screenshots/settings-general.png)

### Key Settings

-   **Instance Information**: Customize the instance name and description.
-   **Localization**: Set the timezone and theme preferences.
-   **Logging & Notifications**: Configure log levels and enable/disable notifications.
-   **System Limits**:
    -   **Max Concurrent Bots**: Control resource usage by limiting active bots.
    -   **Response Timeout**: Define the timeout duration for LLM requests.
    -   **Health Checks**: Enable or disable periodic health monitoring and adjust the check interval.
-   **Advanced Mode**: Unlock additional experimental configuration options.
