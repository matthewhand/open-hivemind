# Open-Hivemind User Guide

Welcome to the Open-Hivemind User Guide. This document provides a detailed walkthrough of the WebUI, organized by the menu structure in the application.

## Table of Contents
- [Overview](#overview)
  - [Dashboard / Overview](#dashboard--overview)
  - [Live Chat Monitor](#live-chat-monitor)
  - [Activity Feed](#activity-feed)
- [Configuration](#configuration)
  - [Bots & Bot Management](#bots--bot-management)
  - [Bot Creation Flow](#bot-creation-flow)
  - [Bot Templates](#bot-templates)
  - [LLM Providers](#llm-providers)
  - [Message Platforms](#message-platforms)
  - [Personas Management](#personas-management)
  - [Guards](#guards)
  - [MCP Servers](#mcp-servers)
  - [MCP Tools](#mcp-tools)
- [System](#system)
  - [Settings Overview](#settings-overview)
  - [Webhook](#webhook)
  - [Monitoring](#monitoring)
  - [Global Defaults](#global-defaults)
  - [Demo Mode](#demo-mode)
- [AI & Analytics](#ai--analytics)
- [Developer & Tools](#developer--tools)
- [Documentation Maintenance](#documentation-maintenance)

---

## Overview

### [Dashboard / Overview](/admin/overview)
The central hub for monitoring your bot ecosystem.
*   **Bot Status**: View real-time status of all running bots (Online, Offline, Error).
*   **Recent Activity**: See a feed of recent interactions and events.
*   **System Health**: Quick glance at CPU, memory, and uptime.

### [Live Chat Monitor](/admin/chat)
Observe conversations across all active bots in real-time. This is useful for monitoring bot performance, debugging responses, and ensuring quality interactions.

![Live Chat Monitor](screenshots/chat-monitor.png)

*   **Bot List**: View all configured bots and their connection status (Online/Offline) in the sidebar.
*   **Conversation History**: Select a bot to view its recent chat history with users.
*   **Real-time Updates**: Use the Refresh button to fetch the latest messages.
*   **Read-Only Mode**: Currently, the interface is read-only. Sending messages directly from the admin panel is disabled to prevent interference with automated flows.

### [Activity Feed](/admin/activity)
A comprehensive view of all message processing events and system actions.

![Activity Page](screenshots/activity-page-filters.png)

*   **Real-time Filters**: Filter events by specific Bot, Message Platform, LLM Provider, or Date Range.
*   **Timeline View**: Switch between a detailed table and a visual timeline of events.
*   **Export Data**: Download the current activity log as a CSV file for external analysis.
*   **Performance Metrics**: View processing duration for each message interaction.

---

## Configuration

### Bots & Bot Management
Create and manage individual bot instances. Connect your AI assistants to platforms like Discord, Slack, Mattermost, and Telegram.

![Bots Page](screenshots/bots-page.png)

*   **Dedicated Create Page**: Access a full-page interface for creating bots at `/admin/bots/create`.
*   **Duplicate Bot**: Quickly clone an existing bot configuration.
![Duplicate Bot Modal](images/clone-bot-modal.png)
*   **View Activity**: Monitor real-time logs and message flow for each bot via details modal.
![Bot Activity Logs](screenshots/bot-details-modal.png)
*   **Link Persona / Providers**: Assign specific personalities, LLM providers, and platforms to the bot.
*   **Active Status**: Toggle bots on or off individually.

### Bot Creation Flow
The Bot Creation page provides a streamlined workflow for deploying new AI assistants.

![Bot Create Page](screenshots/bot-create-page.png)

1.  Navigate to the **Bots** section and click **Create Bot**.
2.  **Name & Description**: Use the AI Assist button to generate creative names and descriptions.
3.  **Visual Platform Selection**: Choose your target messaging platform using an intuitive grid interface.
4.  **Persona**: Choose a **Persona** from the dropdown; verify the details in the preview card.
5.  **Intelligent Defaults**: The system automatically detects and suggests the default LLM provider, simplifying configuration.
6.  Click **Create Bot** to deploy.

### [Bot Templates](/admin/bots/templates)
Quick-start templates to help you create bots faster.

![Bot Templates Page](screenshots/bot-templates-page.png)

*   **Template Gallery**: Browse pre-configured templates with specific personas and provider settings.
*   **Quick Create**: Use a template to pre-populate the bot creation form.
*   **Search & Filter**: Find templates by name or description using the search bar, or filter by platform, persona, and LLM provider.

### [LLM Providers](/admin/providers/llm)
Manage connections to Large Language Model providers.
*   **Dashboard Stats**: View total profiles, provider types, and system default status at a glance.
*   **Add Profile**: Configure reusable connection templates for services like OpenAI, Anthropic, Google Gemini, or local models (via Ollama/vLLM).
*   **System Default**: Define the fallback provider for bots without a specific profile.
*   **WebUI Intelligence**: Select a provider to power internal AI features.

![LLM Providers List](screenshots/llm-providers-list.png)
![Add LLM Profile](screenshots/llm-add-profile-modal.png)

### [Message Platforms](/admin/providers/message)
Connect your bots to messaging services.
*   **Discord**: Add your Discord Bot Token and configure server settings.
*   **Slack**: Set up your Slack App Token and Bot Token.
*   **Mattermost**: Configure your Mattermost URL and Bot Token.
*   **Status**: Check connection health for each platform.

### Personas Management
The Personas (Beta) feature allows you to define distinct AI personalities and system prompts that can be assigned to one or more bots.

![Personas Management](screenshots/personas-page.png)

*   **Persona Library**: Create, edit, and delete custom personas. Built-in personas (like "Technical Assistant") are read-only but can be cloned.
*   **System Prompts**: Define the core instructions (System Prompt) for the AI.
*   **Bulk Assignment**: Assign a persona to multiple bots simultaneously.
*   **Real-time Updates**: Changes to a persona (e.g., updating the prompt) are immediately reflected across all assigned bots.

### [Guards](/admin/guards)
Set up safety and security boundaries.

![Guard Profiles List](screenshots/guards-page.png)
![Create Guard Profile](screenshots/guards-modal.png)

*   **Content Filters**: Block specific words or phrases.
*   **Tool Permissions**: Control which MCP tools a bot is allowed to use.
*   **Input Sanitization**: Configure rules to prevent injection attacks or malicious inputs.

### [MCP Servers](/admin/mcp/servers)
Manage Model Context Protocol servers to extend bot capabilities with external tools.

![MCP Servers List](screenshots/mcp-servers-list.png)
![Add MCP Server](screenshots/mcp-add-server-modal.png)

*   **Server List**: View and manage connected MCP servers.
*   **Add Server**: Connect to a new MCP server by URL.
*   **Tool Discovery**: Automatically discover tools provided by connected servers.
*   **Connection Status**: Monitor server health and retry failed connections.

### [MCP Tools](/admin/mcp/tools)
Browse and manage tools available from your connected MCP servers.

![MCP Tools List](screenshots/mcp-tools-list.png)
![MCP Tool Run Modal](screenshots/mcp-tool-run-modal.png)

*   **Tool Registry**: View all available tools, their descriptions, and server origins.
*   **Schema Inspection**: View input and output schemas for each tool.
*   **Tool Execution**: Test tools directly via **Form Mode** (based on the tool's schema) and **JSON Mode** for advanced input.
*   **Enable/Disable**: Toggle individual tools on or off.

---

## System

### Settings Overview
General system configuration.

![General Settings](screenshots/settings-general.png)

*   **Instance Information**: Configure instance name and description.
*   **Localization**: Set the timezone and language preferences.
*   **Logging & Notifications**: Control system logging levels and notification preferences.
*   **System Limits**: Adjust maximum concurrent bots and response timeouts to manage resource usage.
*   **Health & Monitoring**: Enable and configure periodic health checks for external services.
*   **Deep Linking**: Settings tabs (General, Messaging, Security) are reflected in the URL for easy sharing.

### [Webhook](/admin/integrations/webhook)
Configure incoming webhooks for external integrations.
*   **Endpoint Management**: specific URLs to trigger bot actions from external services.
*   **Security**: Manage webhook secrets and verification.

### [Monitoring](/admin/monitoring)
A comprehensive dashboard for tracking ecosystem status, bot status, and real-time activity.

![Monitoring Dashboard](screenshots/monitoring-dashboard.png)
![Activity Monitor](screenshots/activity-monitor.png)

*   **Ecosystem Status**: Overall health of the bot ecosystem and performance metrics.
*   **Infrastructure Health**: Real-time metrics for CPU, Memory, and API endpoint status.
*   **Bot Status**: Detailed connectivity and health scores for all configured bots.

### [Global Defaults](/admin/configuration)
Set default behaviors for new bots.
*   **Default LLM**: The fallback provider if none is specified for a bot.
*   **Default Persona**: The base personality applied to new bots.

### Demo Mode
When running the application without configuration (e.g., first launch), a **Demo Mode** banner appears.
*   **Simulation**: The system simulates bot activity, conversations, and metrics to demonstrate platform capabilities.
*   **Visual Indicator**: A purple banner indicates that data is simulated and not persisted.

---

## AI & Analytics

### [AI Dashboard](/admin/ai/dashboard)
Visual insights into your AI usage.
*   **Token Usage**: Track token consumption across different providers.
*   **Cost Estimation**: Estimate costs based on usage.
*   **Model Performance**: Compare response times and quality across models.

### [Analytics](/admin/analytics)
Historical data and trends.

![Analytics Dashboard](screenshots/analytics-dashboard.png)

*   **Conversation Volume**: Track message volume over time.
*   **User Engagement**: See active users and interaction frequency.

### [Anomaly Detection](/admin/ai/anomalies)
Identify unusual patterns in bot behavior.
*   **Spike Detection**: Alerts for sudden increases in message volume or errors.
*   **Behavioral Drifts**: Detect if a bot starts deviating from its persona.

### [AI Assistant](/admin/ai/chat)
An internal chat interface for admins to experiment with prompts and query system configurations.

---

## Developer & Tools

### [UI Components](/admin/showcase)
A reference for developers extending the WebUI.
*   **Component Library**: View available UI elements (buttons, inputs, cards) and their usage.

### [System Backups & Export](/admin/export)
Manage system configuration backups and download API documentation.

![System Backups & Export](images/export-page.png)
![Create Backup Modal](images/create-backup-modal.png)

*   **Backup Overview**: View key metrics including total backups and storage usage.
*   **System Backups**: Create, restore, and delete full system configuration backups.
*   **Configuration Export**: Export the current running configuration as a JSON file.
*   **API Specifications**: Download the OpenAPI specification (JSON/YAML) for development.

### [Sitemap](/admin/sitemap)
View the complete navigation structure of the application.

![Sitemap Page](screenshots/sitemap-page.png)

*   **Page Hierarchy & Filtering**: See all available pages and find specific ones by URL or description.
*   **Formats**: Download the sitemap in XML (for SEO) or JSON formats.

### [Specifications](/admin/specs)
Browse and manage persisted specifications and design documents.
*   **Detailed View**: Read full specifications rendered in Markdown.
*   **Export**: Download specifications as Markdown, JSON, or YAML.

### [Static Pages](/admin/static)
Access a catalog of static HTML pages served by the system, like the Enhanced Homepage or Screensaver.

---

## Documentation Maintenance

### Generating Screenshots

To ensure this guide remains up-to-date, screenshots are automatically generated using Playwright.

**Automated Update (GitHub Actions):**
You can trigger the **Update Screenshots** workflow manually from the Actions tab in GitHub.

**Manual Update (Local):**
```bash
npm run generate-docs
```
This process runs the End-to-End (E2E) tests located in `tests/e2e/screenshot-*.spec.ts`, captures the UI state, and saves the images to `docs/screenshots/`.
