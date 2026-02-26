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

## MCP Server Management

The MCP (Model Context Protocol) Servers page allows you to manage external tool providers that extend your bots' capabilities.

![MCP Servers List](screenshots/mcp-servers-list.png)

### Features

-   **Dashboard Overview**: View key metrics at a glance:
    -   **Total Servers**: Number of configured MCP servers.
    -   **Active Connections**: Number of servers currently online and reachable.
    -   **Total Tools**: Aggregate count of tools available across all connected servers.
-   **Server Cards**: Each server card displays:
    -   Connection status (Running/Stopped/Error).
    -   Tool count badge and a "View Tools" button to inspect available capabilities.
    -   Real-time latency indicator for active connections.
-   **Management Actions**: Easily Add, Edit, Delete, or Test connections to MCP servers.

### How to Use

1.  Navigate to **MCP > Servers** in the admin sidebar.
2.  Click **Add Server** to configure a new connection.
3.  Use the **Test Connection** button in the modal to verify the server URL and discover available tools before saving.
