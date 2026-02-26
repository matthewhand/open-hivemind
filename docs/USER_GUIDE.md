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

The System Settings page allows administrators to configure global settings for the Open Hivemind instance, including instance details, localization, logging, and system limits.

![General Settings](screenshots/settings-general.png)

### General Settings

-   **Instance Information**: Set the display name and description for your Open Hivemind instance.
-   **Localization**: Configure the default timezone and language for the admin interface.
-   **Logging & Notifications**: Enable or disable system logging and notifications, and set the log level (Debug, Info, Warning, Error).
-   **System Limits**:
    -   **Max Concurrent Bots**: Set the maximum number of bots that can be active simultaneously.
    -   **Response Timeout**: Define the maximum time (in seconds) the system waits for a response from LLM providers.
    -   **Health Checks**: Enable or disable periodic health checks for system components and external services. Adjust the check interval to balance monitoring frequency with system load.
-   **Advanced Settings**: Enable experimental features and granular configuration options.
