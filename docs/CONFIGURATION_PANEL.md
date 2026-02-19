# Configuration Management Panel

The Configuration Management Panel provides a comprehensive interface for managing all aspects of the Open-Hivemind system configuration. It allows administrators to configure LLM providers, messenger providers, personas, MCP servers, and tool usage guards through a user-friendly web interface.

## Overview

The configuration panel is accessible through the WebUI and provides a tabbed interface with the following sections:

1. **LLM Providers** - Configure language model providers
2. **Messenger Providers** - Configure messaging platform integrations
3. **Personas** - Manage AI personality templates
4. **MCP Servers** - Manage Model Context Protocol server connections
5. **Tool Usage Guards** - Configure access controls for MCP tools

## Features

### LLM Providers

Configure various language model providers including OpenAI, Flowise, OpenWebUI, and OpenSwarm.

**Features:**
- Add, edit, delete, and toggle LLM providers
- Configure provider-specific settings (API keys, models, endpoints)
- Real-time validation of configuration parameters
- Support for multiple providers with active/inactive status

**Configuration Fields:**
- Provider Name: Human-readable name for the provider
- Provider Type: Type of LLM provider (OpenAI, Flowise, etc.)
- API Key: Authentication key for the provider
- Model: Language model to use (provider-specific)
- Base URL: API endpoint URL
- Additional provider-specific settings

### Messenger Providers

Configure integrations with messaging platforms like Discord, Slack, and Mattermost.

**Features:**
- Add, edit, delete, and toggle messenger providers
- Platform-specific configuration forms
- Support for different connection modes (Socket, RTM)
- Channel routing configuration

**Configuration Fields:**
- Provider Name: Human-readable name for the provider
- Provider Type: Type of messenger platform (Discord, Slack, etc.)
- Bot Token: Authentication token for the bot
- Connection Mode: How the bot connects to the platform
- Channel Configuration: Default channels and routing rules

### Personas

Create and manage AI personality templates with custom system prompts.

**Features:**
- Create, edit, and delete personas
- Customizable system prompts
- Key-based identification for easy reference
- Default personas included (Default, Developer, Support)

**Configuration Fields:**
- Key: Unique identifier for the persona
- Name: Human-readable name
- System Prompt: Instructions that define the AI's behavior

### MCP Server Management

Manage connections to Model Context Protocol (MCP) servers for extended functionality.

**Features:**
- Connect to and disconnect from MCP servers
- View available tools from connected servers
- Test server connections
- Authentication management

**Configuration Fields:**
- Server Name: Human-readable name for the server
- Server URL: URL of the MCP server
- API Key: Authentication key (if required)

### Tool Usage Guards

Configure access controls for MCP tools based on user roles and permissions.

**Features:**
- Create, edit, delete, and toggle tool usage guards
- Role-based access control
- User-specific access lists
- Owner-only restrictions

**Guard Types:**
- Owner Only: Only the server owner can use the tool
- User List: Only specified users can use the tool
- Role Based: Only users with specified roles can use the tool

## Security Features

### Access Control

- Admin authentication required for all configuration operations
- Role-based access to configuration panel
- Secure API endpoints with rate limiting

### Data Protection

- Sensitive data (API keys, tokens) is sanitized in responses
- Environment variable override support
- Secure storage of configuration data

### Validation

- Input validation for all configuration fields
- URL format validation for server endpoints
- Guard type validation for tool usage guards

## API Endpoints

The configuration panel uses the following API endpoints:

### LLM Providers
- `GET /api/admin/llm-providers` - List all LLM providers
- `POST /api/admin/llm-providers` - Create a new LLM provider
- `PUT /api/admin/llm-providers/:id` - Update an LLM provider
- `DELETE /api/admin/llm-providers/:id` - Delete an LLM provider
- `POST /api/admin/llm-providers/:id/toggle` - Toggle provider status

### Messenger Providers
- `GET /api/admin/messenger-providers` - List all messenger providers
- `POST /api/admin/messenger-providers` - Create a new messenger provider
- `PUT /api/admin/messenger-providers/:id` - Update a messenger provider
- `DELETE /api/admin/messenger-providers/:id` - Delete a messenger provider
- `POST /api/admin/messenger-providers/:id/toggle` - Toggle provider status

### Personas
- `GET /api/admin/personas` - List all personas
- `POST /api/admin/personas` - Create a new persona
- `PUT /api/admin/personas/:key` - Update a persona
- `DELETE /api/admin/personas/:key` - Delete a persona

### MCP Servers
- `GET /api/admin/mcp-servers` - List all MCP servers
- `POST /api/admin/mcp-servers/connect` - Connect to an MCP server
- `POST /api/admin/mcp-servers/disconnect` - Disconnect from an MCP server
- `GET /api/admin/mcp-servers/:name/tools` - Get tools from a specific server

### Tool Usage Guards
- `GET /api/admin/tool-usage-guards` - List all tool usage guards
- `POST /api/admin/tool-usage-guards` - Create a new tool usage guard
- `PUT /api/admin/tool-usage-guards/:id` - Update a tool usage guard
- `DELETE /api/admin/tool-usage-guards/:id` - Delete a tool usage guard
- `POST /api/admin/tool-usage-guards/:id/toggle` - Toggle guard status

## User Interface

### Tab Navigation

The configuration panel uses a tabbed interface for easy navigation between different configuration areas. Each tab contains:

- Header with title and description
- Add button for creating new items
- List view of existing items with action buttons
- Modal forms for creating and editing items

### Forms and Validation

All configuration forms include:

- Clear field labels and placeholders
- Real-time validation with error messages
- Required field indicators
- Help text for complex fields
- Save and cancel buttons

### Status Indicators

- Active/inactive status toggles
- Connection status for MCP servers
- Error and success message notifications
- Loading states during API operations

## Error Handling

The configuration panel includes comprehensive error handling:

- Network error detection and retry mechanisms
- Validation error display with specific field highlighting
- Server error message display
- Graceful degradation when services are unavailable

## Integration with Existing System

The configuration panel integrates seamlessly with the existing Open-Hivemind system:

- Uses existing authentication and authorization mechanisms
- Leverages the WebUI storage system for persistence
- Follows the existing design patterns and styling
- Maintains compatibility with existing configuration formats

## Deployment Considerations

### Environment Variables

The configuration panel supports environment variable overrides for sensitive configuration:

- `OPENAI_API_KEY` - OpenAI API key
- `DISCORD_BOT_TOKEN` - Discord bot token
- `SLACK_BOT_TOKEN` - Slack bot token
- And other provider-specific variables

### Database Integration

While the current implementation uses mock data, the configuration panel is designed to integrate with:

- SQLite database for configuration storage
- Existing configuration management system
- Environment variable override system

### Security Best Practices

- All API endpoints require admin authentication
- Rate limiting applied to prevent abuse
- Input sanitization to prevent XSS attacks
- Sensitive data redaction in API responses

## Testing

The configuration panel includes comprehensive test coverage:

- Unit tests for all components
- Integration tests for API endpoints
- User interaction testing
- Error scenario testing

Run tests with:

```bash
npm test -- --testPathPattern=ComprehensiveConfigPanel
npm test -- --testPathPattern=LLMProvidersConfig
```

## Future Enhancements

Planned improvements to the configuration panel:

- Configuration import/export functionality
- Configuration templates and presets
- Advanced validation rules
- Configuration history and rollback
- Multi-environment configuration management
- Real-time configuration updates
- Configuration backup and restore