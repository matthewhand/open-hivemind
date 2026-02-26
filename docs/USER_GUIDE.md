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

The System Settings page allows administrators to configure the core behavior of the Open Hivemind instance, including localization, logging, and system limits.

![General Settings](screenshots/settings-general.png)

### General Settings

-   **Instance Information**: Set the display name and description for your Open Hivemind instance.
-   **Localization & Appearance**: Configure the timezone and UI theme (Light, Dark, or System Default).
-   **Logging & Notifications**: Toggle system logging and adjust log levels (Debug, Info, Warn, Error). Enable or disable UI notifications.
-   **System Limits & Health**:
    -   **Max Concurrent Bots**: Limit the number of bots running simultaneously to manage resources.
    -   **Response Timeout**: Set the maximum time to wait for LLM or tool responses.
    -   **Enable Health Checks**: Toggle background health monitoring.
    -   **Health Check Interval**: Adjust how frequently the system checks the status of bots and services.
-   **Advanced Settings**: Enable experimental features and granular configuration options.
