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

The System Settings page allows you to configure global options for your Open Hivemind instance, including instance details, localization, logging, and system limits.

![General Settings](screenshots/settings-general.png)

### Features

-   **Instance Information**: Set the display name and description for your instance.
-   **Localization**: Configure timezone, language, and theme preferences.
-   **Logging & Notifications**: Enable or disable system logs and notifications, and set the desired log level.
-   **System Limits**:
    -   **Max Concurrent Bots**: Limit the number of bots running simultaneously.
    -   **Response Timeout**: Set the maximum time to wait for LLM responses.
    -   **Health Checks**: Enable/disable automated system health monitoring and set the check interval.
-   **Advanced Settings**: Unlock experimental features (use with caution).

### How to Use

1.  Navigate to the **Settings** section in the sidebar.
2.  Adjust the settings as needed.
3.  Click **Save Settings** to apply changes.
    *   Note: Some settings may require a server restart to fully take effect.
