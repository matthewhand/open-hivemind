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

The System Configuration page allows you to manage global settings for your Open Hivemind instance.

![General Settings](screenshots/settings-general.png)

### Features

-   **Instance Information**: Customize the name and description of your Open Hivemind instance.
-   **Localization**: Set the default timezone for logs and display.
-   **Logging & Notifications**: Toggle system logging levels (Debug, Info, Warn, Error) and enable/disable notifications.
-   **System Limits**:
    -   **Max Concurrent Bots**: Limit the number of bots running simultaneously to manage server load.
    -   **Response Timeout**: Set the maximum time (in seconds) to wait for an LLM response before timing out.
    -   **Health Checks**: Enable/disable periodic health checks and set the interval.
-   **Advanced Mode**: Unlock additional experimental features and granular controls.

### How to Use

1.  Navigate to the **Settings** section in the admin sidebar.
2.  The **General** tab is selected by default.
3.  Adjust the settings using the inputs and sliders.
4.  Click **Save Settings** to apply your changes immediately.
