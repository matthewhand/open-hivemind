# User Guide

This guide provides a detailed walkthrough of the Open-Hivemind WebUI, organized by the menu structure you see in the application.

## Overview

### [Dashboard / Overview](/admin/overview)
The central hub for monitoring your bot ecosystem.
*   **Bot Status**: View real-time status of all running bots (Online, Offline, Error).
*   **Recent Activity**: See a feed of recent interactions and events.
*   **System Health**: Quick glance at CPU, memory, and uptime.

### [Activity Feed](/admin/activity)
A comprehensive view of all message processing events and system actions.
![Activity Page](docs/screenshots/activity-page-filters.png)

*   **Real-time Filters**: Filter events by specific Bot, Message Platform, LLM Provider, or Date Range.
*   **Timeline View**: Switch between a detailed table and a visual timeline of events.
*   **Export Data**: Download the current activity log as a CSV file for external analysis.
*   **Performance Metrics**: View processing duration for each message interaction.

## Configuration

### [LLM Providers](/admin/providers/llm)
Manage connections to Large Language Model providers.
*   **Dashboard Stats**: View total profiles, provider types, and system default status at a glance.
*   **Add Profile**: Configure reusable connection templates for services like OpenAI, Anthropic, Google Gemini, or local models (via Ollama/vLLM).
*   **System Default**: Define the fallback provider for bots without a specific profile.
*   **WebUI Intelligence**: Select a provider to power internal AI features.

![LLM Providers List](docs/screenshots/llm-providers-list.png)

![Add LLM Profile](docs/screenshots/llm-add-profile-modal.png)

### [Message Platforms](/admin/providers/message)
Connect your bots to messaging services.
*   **Discord**: Add your Discord Bot Token and configure server settings.
*   **Slack**: Set up your Slack App Token and Bot Token.
*   **Mattermost**: Configure your Mattermost URL and Bot Token.
*   **Status**: Check connection health for each platform.

### [Bots](/admin/bots)
Create and manage individual bot instances.
![Bots Page](docs/screenshots/bots-page.png)

*   **Create Bot**: Define a new bot with a unique name.
![Create Bot Modal](./docs/images/create-bot-modal.png)

*   **Dedicated Create Page**: Access a full-page interface for creating bots at `/admin/bots/create`.
![Create Bot Page](docs/screenshots/bot-create-page.png)

*   **Duplicate Bot**: Quickly clone an existing bot configuration.
![Duplicate Bot Modal](./docs/images/clone-bot-modal.png)

*   **View Activity**: Monitor real-time logs and message flow for each bot.
![Bot Activity Logs](docs/screenshots/bot-details-modal.png)

*   **Link Persona**: Assign a specific personality to the bot.
*   **Assign Providers**: Choose which LLM and Message Platform the bot uses.
*   **Active Status**: Toggle bots on or off individually.

### [Bot Templates](/admin/bots/templates)
Quick-start templates to help you create bots faster.

![Bot Templates Page](docs/screenshots/bot-templates-page.png)

*   **Template Gallery**: Browse pre-configured templates with specific personas and provider settings.
*   **Quick Create**: Use a template to pre-populate the bot creation form.
*   **Filtering**: Find templates by platform, persona, or LLM provider using the dropdown filters.

### [Personas](/admin/personas)
Define the personality and behavior of your bots.
![Personas Page](docs/screenshots/personas-page.png)

*   **System Prompt**: Write the core instructions that define who the bot is (e.g., "You are a helpful coding assistant").
*   **Tone & Style**: Adjust the bot's communication style (formal, casual, witty).
*   **Context**: Provide background information the bot should know.

### [Guards](/admin/guards)
Set up safety and security boundaries.
*   **Content Filters**: Block specific words or phrases.
*   **Tool Permissions**: Control which MCP tools a bot is allowed to use.
*   **Input Sanitization**: Configure rules to prevent injection attacks or malicious inputs.

![Guard Profiles List](docs/screenshots/guards-page.png)

![Create Guard Profile](docs/screenshots/guards-modal.png)

### [MCP Servers](/admin/mcp/servers)
Manage Model Context Protocol servers to extend bot capabilities with external tools.
*   **Server List**: View and manage connected MCP servers.
*   **Add Server**: Connect to a new MCP server by URL.
*   **Tool Discovery**: Automatically discover tools provided by connected servers.
*   **View Tools**: Inspect available tools from connected servers.
*   **Connection Status**: Monitor server health and retry failed connections.

![MCP Servers List](docs/screenshots/mcp-servers-list.png)

![MCP Tools Modal](docs/screenshots/mcp-tools-modal.png)

![Add MCP Server](docs/screenshots/mcp-add-server-modal.png)

### [MCP Tools](/admin/mcp/tools)
Browse and manage tools available from your connected MCP servers.

![MCP Tools List](docs/screenshots/mcp-tools-list.png)

*   **Tool Registry**: View all available tools, their descriptions, and server origins.
*   **Schema Inspection**: View input and output schemas for each tool.
*   **Tool Execution**: Test tools interactively.
    *   **Form Mode**: Fill out user-friendly forms generated from the tool's schema.
    *   **JSON Mode**: Switch to raw JSON input for complex or advanced usage.
*   **Enable/Disable**: Toggle individual tools on or off.

![MCP Tool Run Modal](docs/screenshots/mcp-tool-run-modal.png)

## System

### [Activity Feed](/admin/activity)
Monitor real-time interactions and events across your bot ecosystem.
![Activity Feed](docs/screenshots/activity-page-filters.png)

*   **Real-time Feed**: Watch events as they happen with auto-refresh.
*   **Filtering**: Filter events by Bot, Provider, LLM, or Date Range to isolate specific interactions.
*   **Export**: Download the activity log as a CSV file for offline analysis.
*   **Timeline View**: Visualize the sequence of events over time.

### [Settings](/admin/settings)
General system configuration.
![General Settings](docs/screenshots/settings-general.png)

*   **Instance Information**: Configure instance name and description.
*   **Localization & Appearance**: Set the system **Timezone** and Theme.
*   **Logging & Notifications**: Configure log levels and enable system logging.
*   **System Limits**: Adjust concurrent bots, timeouts, and health check intervals.

### [Webhook](/admin/integrations/webhook)
Configure incoming webhooks for external integrations.
*   **Endpoint Management**: specific URLs to trigger bot actions from external services.
*   **Security**: Manage webhook secrets and verification.

### [Monitoring](/admin/monitoring)
A comprehensive dashboard for tracking ecosystem status, bot status, and real-time activity.

![Monitoring Dashboard](docs/screenshots/monitoring-dashboard.png)

*   **Ecosystem Status**: Overall health of the bot ecosystem and performance metrics.
*   **Infrastructure Health**: Real-time metrics for CPU, Memory, and API endpoint status.
*   **Bot Status**: Detailed connectivity and health scores for all configured bots.
*   **Activity Monitor**: Live feed of system events with filtering and search capabilities.

![Activity Monitor](docs/screenshots/activity-monitor.png)

### [Global Defaults](/admin/configuration)
Set default behaviors for new bots.
*   **Default LLM**: The fallback provider if none is specified for a bot.
*   **Default Persona**: The base personality applied to new bots.

### Demo Mode
When running the application without configuration (e.g., first launch), a **Demo Mode** banner appears at the top of the screen.
*   **Simulation**: The system simulates bot activity, conversations, and metrics to demonstrate platform capabilities.
*   **Visual Indicator**: A purple banner indicates that data is simulated and not persisted.
*   **Configuration**: The banner provides a quick link to Settings to configure real providers and exit Demo Mode.

## AI & Analytics

### [AI Dashboard](/admin/ai/dashboard)
Visual insights into your AI usage.
*   **Token Usage**: Track token consumption across different providers.
*   **Cost Estimation**: Estimate costs based on usage.
*   **Model Performance**: Compare response times and quality across models.

### [Analytics](/admin/analytics)
Historical data and trends.
![Analytics Dashboard](docs/screenshots/analytics-dashboard.png)

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

### [System Backups & Export](/admin/export)
Manage system configuration backups and download API documentation.

![System Backups & Export](docs/images/export-page.png)

*   **Backup Overview**: View key metrics including total backups, total storage usage, and the date of the latest backup.
*   **System Backups**: Create, restore, and delete full system configuration backups.
    *   **Create Backup**: Save a snapshot of your current bot and system configuration.
    ![Create Backup Modal](docs/images/create-backup-modal.png)
    *   **Restore**: Revert the system to a previous state from a backup.
    *   **Download**: Save backup files locally for safekeeping.
*   **Configuration Export**: Export the current running configuration as a JSON file.
*   **API Specifications**: Download the OpenAPI specification (JSON/YAML) for development.

### [Sitemap](/admin/sitemap)
View the complete navigation structure of the application.
*   **Page Hierarchy**: See all available pages and their relationships.
*   **Search & Filter**: Find specific pages by URL or description, and filter by access level.
*   **Formats**: Download the sitemap in XML (for SEO) or JSON formats.

![Sitemap Page](docs/screenshots/sitemap-page.png)

### [Specifications](/admin/specs)
Browse and manage persisted specifications and design documents.
*   **Spec Registry**: Search and filter specifications by topic or tag.
*   **Detailed View**: Read full specifications rendered in Markdown.
*   **Export**: Download specifications as Markdown, JSON, or YAML.

### [Static Pages](/admin/static)
Access a catalog of static HTML pages served by the system.
*   **Page Gallery**: Preview special pages like the Enhanced Homepage, Loading Screen, and Screensaver.
*   **Direct Access**: Open static pages in new tabs for testing or display.

## Documentation Maintenance

### Generating Screenshots

To ensure this guide remains up-to-date, screenshots are automatically generated using Playwright. This workflow allows for on-demand updates to visual documentation.

**Automated Update (GitHub Actions):**
You can trigger the **Update Screenshots** workflow manually from the Actions tab in GitHub to regenerate and commit new screenshots.

**Manual Update (Local):**
To regenerate screenshots locally:
1. Ensure you have installed dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install chromium`
3. Run the generation script:
   ```bash
   npm run generate-docs
   ```

This process runs the End-to-End (E2E) tests located in `tests/e2e/screenshot-*.spec.ts`, captures the current state of the UI, and saves the images to `docs/screenshots/`.
This automated workflow ensures that the documentation always reflects the current design and layout of the application, including any recent UI improvements or fixes.
