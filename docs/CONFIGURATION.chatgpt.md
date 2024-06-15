# Configuration Management

## Table of Contents
- [Overview](#overview)
- [Configuration File (`config.json`)](#configuration-file-configjson)
- [Environment Variables](#environment-variables)
- [Debug Mode](#debug-mode)

## Overview
The configuration management system allows for flexible and dynamic configuration of the bot. It supports loading settings from a JSON file, applying environment variables, and validating required settings to ensure the bot operates smoothly.

## Configuration File (`config.json`)
The `config.json` file is the primary source of configuration settings for the bot. It should be located in the `config` directory and contain all necessary settings in JSON format.

Example `config.json`:
```json
{
  "CLIENT_ID": "your-client-id",
  "DISCORD_TOKEN": "your-discord-token",
  "GUILD_ID": "your-guild-id",
  "LLM_MESSAGE_LIMIT_PER_HOUR": 100,
  "LLM_MESSAGE_LIMIT_PER_DAY": 1000,
  "LLM_BOT_DEBUG_MODE": false
}
```

## Environment Variables
Environment variables provide an additional layer of configuration, allowing settings to be overridden without modifying the `config.json` file. This is particularly useful for deployment in different environments.

### Required Environment Variables
- `CLIENT_ID`: The Discord client ID.
- `DISCORD_TOKEN`: The Discord bot token.
- `GUILD_ID`: The Discord guild (server) ID.

### LLM-Specific Environment Variables
All environment variables prefixed with `LLM_` are automatically applied to the configuration. For example:
- `LLM_MESSAGE_LIMIT_PER_HOUR`: Sets the hourly message limit for the bot.
- `LLM_MESSAGE_LIMIT_PER_DAY`: Sets the daily message limit for the bot.
- `LLM_BOT_DEBUG_MODE`: Enables or disables debug mode.

## Dynamic Updates
Configuration settings can be dynamically updated during runtime. This allows for changes to be applied without restarting the bot.

## Debug Mode
If debug mode is enabled (`LLM_BOT_DEBUG_MODE=true`), all environment variables are printed to the console for troubleshooting purposes.

To enable debug mode, set the following in your `.env` file:
```env
LLM_BOT_DEBUG_MODE=true
```
