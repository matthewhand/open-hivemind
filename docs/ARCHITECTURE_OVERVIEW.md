# Architecture Overview for Chatbot Instances

## System Architecture

This document provides a high-level overview of the chatbot system architecture for quick understanding by new instances.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Messenger Services (IMessengerService)                    │
│  ├─ DiscordService (multi-bot support)                     │
│  ├─ SlackService                                          │
│  └─ MattermostService                                     │
├─────────────────────────────────────────────────────────────┤
│  Message Providers (IMessageProvider)                      │
│  ├─ DiscordMessageProvider                                │
│  ├─ SlackMessageProvider                                  │
│  └─ Platform-specific providers                           │
├─────────────────────────────────────────────────────────────┤
│  LLM Providers (ILlmProvider)                              │
│  ├─ openAiProvider (OpenAI API)                           │
│  ├─ flowiseProvider (Flowise integration)                 │
│  ├─ openWebUI (Local OpenWebUI)                           │
│  └─ Custom providers                                      │
├─────────────────────────────────────────────────────────────┤
│  Message Abstraction (IMessage)                            │
│  ├─ DiscordMessage                                        │
│  ├─ SlackMessage                                          │
│  ├─ SyntheticMessage (system messages)                    │
│  └─ Platform implementations                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Platform Abstraction**: All platform-specific code is isolated behind interfaces
2. **Multi-Provider Support**: Multiple LLM providers can be configured simultaneously
3. **Configuration Flexibility**: Supports environment variables, config files, and new configuration system
4. **Error Resilience**: Comprehensive error handling and retry mechanisms
5. **Type Safety**: Full TypeScript support with strict typing

## Quick Start Guide

### 1. Configuration Setup

```bash
# Basic single-provider setup
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your-key-here

# Multi-provider setup
export LLM_PROVIDER=openai,flowise
export OPENAI_API_KEY=your-openai-key
export FLOWISE_BASE_URL=http://localhost:3000

# Discord setup
export DISCORD_BOT_TOKEN=your-discord-token
```

### 2. Provider Selection

The system automatically selects providers based on `LLM_PROVIDER` configuration:

- **openai**: Full OpenAI API support (chat + text completions)
- **flowise**: Flowise integration (chat completions only, requires channelId)
- **openwebui**: Local OpenWebUI instance (chat completions only)

### 3. Message Flow

1. **Incoming Message** → Platform-specific message wrapper (DiscordMessage, SlackMessage)
2. **Message Processing** → IMessage interface abstraction
3. **LLM Request** → Selected provider processes request
4. **Response** → Platform-specific response formatting

## Configuration Sources (Priority Order)

1. **Environment Variables** (highest priority)
2. **BotConfigurationManager** (new system)
3. **Legacy Config Files** (fallback)

## Error Handling Patterns

- **Provider Failures**: Automatic fallback to next configured provider
- **Network Issues**: Exponential backoff retry (3 attempts)
- **Configuration Errors**: Clear error messages with troubleshooting guidance
- **Missing Parameters**: Graceful degradation with informative responses

## Extension Points

### Adding New LLM Provider

1. Implement `ILlmProvider` interface
2. Add to `getLlmProvider()` factory function
3. Update configuration documentation

### Adding New Platform

1. Implement `IMessage` for platform messages
2. Create `IMessageProvider` for message retrieval
3. Implement `IMessengerService` for platform integration
4. Update configuration system

## Common Pitfalls

1. **Flowise Provider**: Always requires `channelId` in metadata
2. **Multi-bot Setup**: Use BotConfigurationManager for complex configurations
3. **Token Validation**: Empty tokens cause initialization failures
4. **Rate Limiting**: Implement proper rate limiting for production use

## Debugging

Enable debug logging:
```bash
export DEBUG=app:*  # All debug logs
export DEBUG=app:getLlmProvider  # Specific component
export DEBUG=app:openAiProvider  # OpenAI-specific logs