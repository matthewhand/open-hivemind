# Idle Response Feature

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Channel Routing](channel-routing.md)


The idle response feature allows the bot to automatically respond to channels that have been idle for a random period between 60 seconds and 60 minutes. This feature works across all supported platforms (Discord, Slack, etc.) and leverages the existing LLM infrastructure for contextual responses.

## Overview

The idle response system tracks channel activity and automatically triggers responses when:
1. A channel has been idle for a random period (60s-60min)
2. The bot has been interacted with at least once in that channel (skips first message)
3. The channel is the last one the bot interacted with
4. The bot hasn't responded too recently

## Configuration

Configure idle responses in your `config/default.json` or environment-specific config:

```json
{
  "message": {
    "discord": {
      "idleResponse": {
        "enabled": true,
        "minDelay": 60000,
        "maxDelay": 3600000,
        "prompts": [
          "The conversation seems to have paused. Is there anything else you'd like to discuss?",
          "I notice it's been quiet for a bit. I'm here if you need assistance."
        ]
      }
    }
  }
}
```

### Configuration Options

- **enabled**: Enable/disable idle responses (default: true)
- **minDelay**: Minimum idle time in milliseconds before triggering (default: 60000)
- **maxDelay**: Maximum idle time in milliseconds before triggering (default: 3600000)
- **prompts**: Array of prompts to send to the LLM for generating contextual idle responses

### Environment Variable Overrides

You can override configuration values using environment variables:

- **IDLE_RESPONSE_ENABLED**: Override enabled state (`true`/`false`)
- **IDLE_RESPONSE_MIN_DELAY**: Override minimum delay in milliseconds
- **IDLE_RESPONSE_MAX_DELAY**: Override maximum delay in milliseconds

**Example usage for testing:**
```bash
# Set short delays for quick testing
IDLE_RESPONSE_MIN_DELAY=5000 IDLE_RESPONSE_MAX_DELAY=10000 npm start

# Disable idle responses
IDLE_RESPONSE_ENABLED=false npm start

# Use timeout for testing
timeout 30 IDLE_RESPONSE_MIN_DELAY=2000 IDLE_RESPONSE_MAX_DELAY=5000 npm start
```

## How It Works

1. **Interaction Tracking**: Every message processed by the bot is recorded
2. **Channel Activity**: The system tracks the last interaction time and interaction count per channel
3. **Idle Detection**: After the first interaction, timers are set for random delays
4. **LLM Integration**: When idle time is detected, the system uses existing LLM providers to generate contextual responses based on channel history
5. **Platform Agnostic**: Works with Discord, Slack, and any other messenger service implementing IMessengerService

## Key Features

- **Cross-Platform**: Works with Discord, Slack, and other messenger services
- **Contextual Responses**: Uses existing LLM infrastructure for natural, contextual responses
- **Smart Scheduling**: Random delays prevent predictable patterns
- **First Message Skip**: Only activates after the bot has been interacted with at least once
- **Last Channel Focus**: Only responds to the most recently interacted channel
- **Rate Limiting**: Prevents rapid consecutive responses

## Usage

The feature is automatically initialized when the bot starts. No additional setup is required beyond configuration.

### Manual Control

You can programmatically control the idle response manager:

```typescript
import { IdleResponseManager } from '@message/management/IdleResponseManager';

const idleManager = IdleResponseManager.getInstance();

// Disable idle responses
idleManager.configure({ enabled: false });

// Change timing
idleManager.configure({ minDelay: 30000, maxDelay: 1800000 });

// Get statistics
const stats = idleManager.getStats();
console.log(stats);
```

### Statistics

The manager provides statistics about idle response activity:

```typescript
const stats = IdleResponseManager.getInstance().getStats();
// Returns:
// {
//   totalServices: 3,
//   serviceDetails: [
//     {
//       serviceName: 'discord-Bot1',
//       totalChannels: 3,
//       lastInteractedChannel: '123456789',
//       channelDetails: [...]
//     },
//     {
//       serviceName: 'discord-Bot2',
//       totalChannels: 2,
//       lastInteractedChannel: '987654321',
//       channelDetails: [...]
//     }
//   ]
// }
```

## Integration with Existing Systems

The idle response feature integrates seamlessly with:

- **Message Handler**: Uses the same `handleMessage()` function for processing
- **LLM Providers**: Leverages existing OpenAI, Flowise, or other LLM providers
- **Message Scheduling**: Uses the existing MessageDelayScheduler for response timing
- **Configuration**: Uses the same configuration system as other features
- **Logging**: Uses Debug for consistent logging across the application

## Troubleshooting

### Idle responses not triggering
- Check that `idleResponse.enabled` is set to `true` in configuration
- Ensure the bot has been interacted with at least once in the channel
- Verify the channel is the last one the bot interacted with
- Check logs for any error messages

### Too frequent responses
- Increase `minDelay` and `maxDelay` values in configuration
- Check that the bot isn't responding to its own idle responses

### No responses on specific platforms
- Ensure the messenger service is properly implementing IMessengerService
- Check platform-specific configuration in config files

## Multi-Bot Instance Support

The idle response feature now supports multiple bot instances within the same service type, particularly for Discord services with multiple bot tokens.

### How Multi-Bot Support Works

When multiple Discord bot instances are configured, each bot is tracked separately with unique service names:

- **Discord Bot1**: `discord-Bot1`
- **Discord Bot2**: `discord-Bot2`
- **Unnamed bots**: `discord-bot1`, `discord-bot2`, etc.

This ensures that:
- Each bot instance maintains its own channel activity tracking
- Idle responses are sent using the correct bot instance
- No cross-contamination between bot instances occurs

### Configuration for Multi-Bot Setup

When using multiple Discord bot instances, configure idle responses for each bot:

```json
{
  "message": {
    "discord": {
      "Bot1": {
        "idleResponse": {
          "enabled": true,
          "minDelay": 60000,
          "maxDelay": 3600000
        }
      },
      "Bot2": {
        "idleResponse": {
          "enabled": true,
          "minDelay": 120000,
          "maxDelay": 7200000
        }
      }
    }
  }
}
```

## Architecture

The feature is built on these key components:

- **IdleResponseManager**: Central manager for idle response logic with multi-bot support
- **SyntheticMessage**: Creates synthetic messages for LLM processing
- **ChannelActivity**: Tracks interaction history per channel
- **ServiceActivity**: Manages tracking per messenger service and bot instance
- **BotInstanceWrapper**: Ensures correct bot instance is used for responses

All components are designed to be platform-agnostic and integrate with existing infrastructure while maintaining isolation between bot instances.