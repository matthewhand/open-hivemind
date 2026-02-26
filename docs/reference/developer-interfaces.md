# Developer Interface Documentation

This document provides a comprehensive overview of all interfaces in the messaging system, their purposes, and usage patterns.

## Core Message Interfaces

### IMessage (Abstract Base Class)
**Location:** `src/message/interfaces/IMessage.ts`

The `IMessage` abstract class serves as the foundation for all message types across different platforms. It provides a unified interface for Discord, Slack, and other messaging platforms.

#### Key Properties
- `content: string` - The text content of the message
- `channelId: string` - Unique identifier of the channel
- `role: string` - Message role (user, assistant, system, tool)
- `metadata?: any` - Optional additional metadata
- `tool_call_id?: string` - Required for tool role messages
- `tool_calls?: any[]` - Optional tool invocations for assistant messages

#### Key Methods
- `getMessageId(): string` - Returns unique message identifier
- `getText(): string` - Returns message text content
- `getTimestamp(): Date` - Returns message creation time
- `getAuthorId(): string` - Returns message author's ID
- `isFromBot(): boolean` - Checks if message is from a bot
- `mentionsUsers(userId: string): boolean` - Checks if user is mentioned

#### Usage Example
```typescript
class DiscordMessage implements IMessage {
  // Implementation details...
}

const message = new DiscordMessage(discordMessage);
console.log(message.getText()); // "Hello from Discord!"
```

### IMessageProvider (Low-level Transport)
**Location:** `src/message/interfaces/IMessageProvider.ts`

Provides low-level message transport capabilities for platform-specific implementations.

#### Methods
- `sendMessage(channelId, message, senderName?)` - Send a message to a channel
- `getMessages(channelId)` - Retrieve messages from a channel
- `sendMessageToChannel(channelId, message, activeAgentName?)` - Send with agent name
- `getClientId()` - Get the provider's client identifier

#### Usage Example
```typescript
const provider = new DiscordMessageProvider();
const messageId = await provider.sendMessage("123456789", "Hello, world!");
```

### IMessengerService (High-level Service)
**Location:** `src/message/interfaces/IMessengerService.ts`

High-level interface for messaging services that abstracts platform-specific details.

#### Methods
- `initialize()` - Initialize the messaging service
- `sendMessageToChannel(channelId, message, senderName?, threadId?)` - Send message
- `getMessagesFromChannel(channelId)` - Get channel messages
- `sendPublicAnnouncement(channelId, announcement)` - Send announcements
- `setMessageHandler(handler)` - Set message processing handler

#### Usage Example
```typescript
const service = new DiscordService();
await service.initialize();
await service.sendMessageToChannel("general", "Hello everyone!");
```

## LLM Integration Interfaces

### ILlmProvider
**Location:** `src/llm/interfaces/ILlmProvider.ts`

Interface for Large Language Model providers supporting both chat and text completions.

#### Methods
- `supportsChatCompletion()` - Check if chat completions are supported
- `supportsCompletion()` - Check if text completions are supported
- `generateChatCompletion(userMessage, historyMessages, metadata?)` - Generate chat response
- `generateCompletion(prompt)` - Generate text completion

#### Usage Example
```typescript
const provider = new OpenAiProvider();
if (provider.supportsChatCompletion()) {
  const response = await provider.generateChatCompletion(
    "What's the weather?",
    historyMessages,
    { channel: "general" }
  );
}
```

## Common Types

### ICommonUIElement
**Location:** `src/message/common/commonTypes.ts`

Standardized UI element interface for cross-platform compatibility.

#### Properties
- `type: 'text' | 'button' | 'image' | 'embed'` - Element type
- `text?: string` - Text content
- `url?: string` - URL for buttons/images
- Additional properties supported via index signature

#### Usage Example
```typescript
const button: ICommonUIElement = {
  type: 'button',
  text: 'Click me',
  url: 'https://example.com'
};
```

### ICommonMessage
**Location:** `src/message/common/commonTypes.ts`

Standardized message format for cross-platform messages.

#### Properties
- `text: string` - Message content
- `senderId: string` - Message sender identifier
- `channelId: string` - Channel identifier
- `timestamp: Date` - Message creation time
- `uiElements?: ICommonUIElement[]` - Optional UI elements

## Utility Classes

### SyntheticMessage
**Location:** `src/message/management/SyntheticMessage.ts`

Creates system-generated messages for automated responses and notifications.

#### Usage Example
```typescript
const original = new DiscordMessage(discordMessage);
const synthetic = new SyntheticMessage(original, "System notification");
console.log(synthetic.getAuthorName()); // "System"
console.log(synthetic.isFromBot()); // true
```

## Platform-Specific Implementations

### DiscordMessage
**Location:** `packages/adapter-discord/src/DiscordMessage.ts`

Discord-specific implementation of IMessage that wraps Discord.js Message objects.

### SlackMessage
**Location:** `packages/adapter-slack/src/SlackMessage.ts`

Slack-specific implementation of IMessage (currently a placeholder for full Slack integration).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  IMessengerService (High-level service interface)          │
│  - DiscordService                                          │
│  - SlackService                                            │
│  - MattermostService                                       │
├─────────────────────────────────────────────────────────────┤
│  IMessageProvider (Low-level transport interface)          │
│  - DiscordMessageProvider                                  │
│  - SlackMessageProvider                                    │
├─────────────────────────────────────────────────────────────┤
│  IMessage (Message abstraction)                            │
│  - DiscordMessage                                          │
│  - SlackMessage                                            │
│  - SyntheticMessage                                        │
├─────────────────────────────────────────────────────────────┤
│  ILlmProvider (LLM integration)                            │
│  - OpenAiProvider                                          │
│  - FlowiseProvider                                         │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Interface Implementation**: Always implement the full interface contract
2. **Error Handling**: Document error conditions in JSDoc
3. **Type Safety**: Use TypeScript types consistently
4. **Documentation**: Follow JSDoc standards for all public APIs
5. **Testing**: Ensure implementations are testable with mock data

## Migration Guide

When adding new platforms:
1. Implement IMessage for the new platform
2. Create IMessageProvider implementation
3. Optionally create IMessengerService implementation
4. Add platform-specific configuration
5. Update documentation and examples

## Quick Reference

| Interface | Purpose | Key File |
|-----------|---------|----------|
| IMessage | Message abstraction | `src/message/interfaces/IMessage.ts` |
| IMessageProvider | Low-level transport | `src/message/interfaces/IMessageProvider.ts` |
| IMessengerService | High-level service | `src/message/interfaces/IMessengerService.ts` |
| ILlmProvider | LLM integration | `src/llm/interfaces/ILlmProvider.ts` |
| ICommonMessage | Cross-platform message | `src/message/common/commonTypes.ts` |
| SyntheticMessage | System messages | `src/message/management/SyntheticMessage.ts` |