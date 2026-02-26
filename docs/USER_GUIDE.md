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

The System Settings page provides centralized control over the Open Hivemind instance, allowing you to configure global preferences, localization, and system limits.

![General Settings](screenshots/settings-general.png)

### Features

-   **Instance Information**: Set the display name and description for your instance.
-   **Localization**: Configure the default timezone and interface theme (Light/Dark/Auto).
-   **Logging & Notifications**: Toggle system-wide logging, set log levels, and enable/disable notifications.
-   **System Limits**:
    -   **Max Concurrent Bots**: Limit the number of active bots to manage resource usage.
    -   **Response Timeout**: Set the global timeout for bot responses.
    -   **Health Checks**: Enable or disable automated health monitoring and configure the check interval.
-   **Advanced Mode**: Unlock experimental features and granular configuration options.

### How to Use

1.  Navigate to **Settings** > **General** in the admin sidebar.
2.  Adjust the settings as needed using the form controls.
3.  Click **Save Settings** to apply changes.
4.  Note: Some changes (like Logging Level) may take effect immediately, while others may require a server restart.
