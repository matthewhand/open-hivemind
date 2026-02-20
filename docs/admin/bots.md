# Bot Management

Open-Hivemind allows you to create, configure, and manage multiple AI agents (bots).

## Creating a Bot
You can create a new bot from the **Overview** dashboard or the **Bots** page.

### The Bot Creation Wizard
Clicking **Create Bot** opens a multi-step wizard:

1.  **Basics**:
    *   **Name**: A unique identifier for your bot.
    *   **Description**: A brief summary of its purpose.
    *   **Message Provider**: The platform where the bot will live (e.g., Discord, Slack).
    *   **LLM Provider**: The AI model powering the bot (e.g., OpenAI, local LLM).

2.  **Persona**:
    *   Select from built-in personas (e.g., "Helpful Assistant", "Developer") or custom ones.
    *   Personas define the system prompt and personality.

3.  **Guardrails**:
    *   **Access Control**: Restrict bot usage to specific users or roles.
    *   **Rate Limiting**: Prevent spam by limiting message frequency.
    *   **Content Filtering**: Block inappropriate content.

Click **Finish & Create** to deploy your new agent.

## Managing Bots
The **Bots** page (`/admin/bots`) lists all configured agents.

*   **Status Indicators**:
    *   **Running** (Green): Bot is active and connected.
    *   **Disconnected** (Yellow): Bot is active but lost connection.
    *   **Disabled** (Gray): Bot is stopped.
*   **Actions**:
    *   **Toggle**: Start/Stop the bot.
    *   **Edit**: Modify configuration (Provider, Persona, etc.).
    *   **Clone**: Create a copy of the bot's configuration.
    *   **Delete**: Remove the bot (unless defined by environment variables).
