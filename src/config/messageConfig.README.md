# Message Configuration

The Message configuration module manages settings for message handling across different platforms.

## Configuration Options

### MESSAGE_PROVIDER
- **Description**: Messaging platform (e.g., slack, discord)
- **Type**: String
- **Default**: `'slack'`
- **Environment Variable**: `MESSAGE_PROVIDER`

### MESSAGE_IGNORE_BOTS
- **Description**: Ignore messages from bots
- **Type**: Boolean
- **Default**: `true`
- **Environment Variable**: `MESSAGE_IGNORE_BOTS`

### MESSAGE_ADD_USER_HINT
- **Description**: Add user hints to messages
- **Type**: Boolean
- **Default**: `true`
- **Environment Variable**: `MESSAGE_ADD_USER_HINT`

### MESSAGE_RATE_LIMIT_PER_CHANNEL
- **Description**: Max messages per minute per channel
- **Type**: Integer
- **Default**: `5`
- **Environment Variable**: `MESSAGE_RATE_LIMIT_PER_CHANNEL`

### MESSAGE_MIN_DELAY
- **Description**: Minimum response delay (ms)
- **Type**: Integer
- **Default**: `1000`
- **Environment Variable**: `MESSAGE_MIN_DELAY`

### MESSAGE_MAX_DELAY
- **Description**: Maximum response delay (ms)
- **Type**: Integer
- **Default**: `10000`
- **Environment Variable**: `MESSAGE_MAX_DELAY`

### MESSAGE_ACTIVITY_TIME_WINDOW
- **Description**: Silence window for follow-ups (ms)
- **Type**: Integer
- **Default**: `300000`
- **Environment Variable**: `MESSAGE_ACTIVITY_TIME_WINDOW`

### MESSAGE_WAKEWORDS
- **Description**: Comma-separated wakewords
- **Type**: String
- **Default**: `'!help,!ping'`
- **Environment Variable**: `MESSAGE_WAKEWORDS`

### MESSAGE_ONLY_WHEN_SPOKEN_TO
- **Description**: Only respond when directly addressed
- **Type**: Boolean
- **Default**: `true`
- **Environment Variable**: `MESSAGE_ONLY_WHEN_SPOKEN_TO`

### MESSAGE_INTERACTIVE_FOLLOWUPS
- **Description**: Enable interactive follow-ups
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_INTERACTIVE_FOLLOWUPS`

### MESSAGE_UNSOLICITED_ADDRESSED
- **Description**: Allow unsolicited responses in addressed channels
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_UNSOLICITED_ADDRESSED`

### MESSAGE_UNSOLICITED_UNADDRESSED
- **Description**: Allow unsolicited responses in unaddressed channels
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_UNSOLICITED_UNADDRESSED`

### MESSAGE_RESPOND_IN_THREAD
- **Description**: Respond in threads
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_RESPOND_IN_THREAD`

### MESSAGE_THREAD_RELATION_WINDOW
- **Description**: Time window for thread relation (ms)
- **Type**: Integer
- **Default**: `300000`
- **Environment Variable**: `MESSAGE_THREAD_RELATION_WINDOW`

### MESSAGE_RECENT_ACTIVITY_DECAY_RATE
- **Description**: Decay rate for recent activity chance
- **Type**: Number
- **Default**: `0.001`
- **Environment Variable**: `MESSAGE_RECENT_ACTIVITY_DECAY_RATE`

### MESSAGE_INTERROBANG_BONUS
- **Description**: Bonus chance for messages ending in ! or ?
- **Type**: Number
- **Default**: `0.3`
- **Environment Variable**: `MESSAGE_INTERROBANG_BONUS`

### MESSAGE_BOT_RESPONSE_MODIFIER
- **Description**: Modifier for responses to bot messages
- **Type**: Number
- **Default**: `-1.0`
- **Environment Variable**: `MESSAGE_BOT_RESPONSE_MODIFIER`

### MESSAGE_COMMAND_INLINE
- **Description**: Enable inline command processing
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_COMMAND_INLINE`

### MESSAGE_COMMAND_AUTHORISED_USERS
- **Description**: Comma-separated list of authorized user IDs
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `MESSAGE_COMMAND_AUTHORISED_USERS`

### MESSAGE_LLM_FOLLOW_UP
- **Description**: Enable LLM follow-up messages
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `MESSAGE_LLM_FOLLOW_UP`

### BOT_ID
- **Description**: Bot identifier
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `BOT_ID`

### MESSAGE_MIN_INTERVAL_MS
- **Description**: Minimum interval between message processing (ms)
- **Type**: Integer
- **Default**: `1000`
- **Environment Variable**: `MESSAGE_MIN_INTERVAL_MS`

### MESSAGE_STRIP_BOT_ID
- **Description**: Whether to strip bot ID from messages
- **Type**: Boolean
- **Default**: `true`
- **Environment Variable**: `MESSAGE_STRIP_BOT_ID`

### MESSAGE_USERNAME_OVERRIDE
- **Description**: Override username for the bot across all platforms
- **Type**: String
- **Default**: `'MadgwickAI'`
- **Environment Variable**: `MESSAGE_USERNAME_OVERRIDE`

## Usage

```typescript
import messageConfig from './messageConfig';

const provider = messageConfig.get('MESSAGE_PROVIDER');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS');
const minDelay = messageConfig.get('MESSAGE_MIN_DELAY');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/message.json`)
3. Default values

## Example Configuration File

```json
{
  "MESSAGE_PROVIDER": "slack",
  "MESSAGE_IGNORE_BOTS": true,
  "MESSAGE_ADD_USER_HINT": true,
  "MESSAGE_RATE_LIMIT_PER_CHANNEL": 5,
  "MESSAGE_MIN_DELAY": 1000,
  "MESSAGE_MAX_DELAY": 10000,
  "MESSAGE_ACTIVITY_TIME_WINDOW": 300000,
  "MESSAGE_WAKEWORDS": "!help,!ping",
  "MESSAGE_ONLY_WHEN_SPOKEN_TO": true,
  "MESSAGE_INTERACTIVE_FOLLOWUPS": false,
  "MESSAGE_UNSOLICITED_ADDRESSED": false,
  "MESSAGE_UNSOLICITED_UNADDRESSED": false,
  "MESSAGE_RESPOND_IN_THREAD": false,
  "MESSAGE_THREAD_RELATION_WINDOW": 300000,
  "MESSAGE_RECENT_ACTIVITY_DECAY_RATE": 0.001,
  "MESSAGE_INTERROBANG_BONUS": 0.3,
  "MESSAGE_BOT_RESPONSE_MODIFIER": -1.0,
  "MESSAGE_COMMAND_INLINE": false,
  "MESSAGE_COMMAND_AUTHORISED_USERS": "",
  "MESSAGE_LLM_FOLLOW_UP": false,
  "BOT_ID": "",
  "MESSAGE_MIN_INTERVAL_MS": 1000,
  "MESSAGE_STRIP_BOT_ID": true,
  "MESSAGE_USERNAME_OVERRIDE": "MadgwickAI"
}