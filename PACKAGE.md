# Open-Hivemind Package

## Package Overview
- **Name**: `open-hivemind`
- **Version**: `1.0.0`
- **License**: MIT
- **Type**: CommonJS with TypeScript

## Core Capabilities

### Multi-Platform Messaging
- **Discord**: Full bot integration with multi-instance support
- **Slack**: Socket Mode + Web API with bot management
- **Mattermost**: REST API integration (experimental)

### LLM Providers
- **OpenAI**: GPT models with chat/completion support
- **Flowise**: Low-code LLM workflows
- **OpenWebUI**: Local LLM instances

### Architecture
- **Modular**: Plugin-based provider system
- **Scalable**: Multi-bot instance management
- **Testable**: 81 test suites, 72.75% coverage
- **Configurable**: Environment + JSON config system

## Scripts
- `npm test` - Run test suite
- `npm run lint` - ESLint validation
- `npm run build` - TypeScript compilation
- `npm start` - Production server
- `npm run validate` - Lint + test

## Key Dependencies
- `discord.js` ^14.14.1 - Discord API
- `@slack/web-api` ^7.8.0 - Slack integration
- `openai` ^4.82.0 - OpenAI API
- `express` ^4.21.2 - HTTP server
- `convict` ^6.2.4 - Configuration management

## Module Aliases
- `@src` - Source root
- `@config` - Configuration modules
- `@integrations` - Platform integrations
- `@message` - Message handling
- `@llm` - LLM providers

## Status
- ✅ Tests passing (81/84 suites)
- ⚠️ Coverage: 72.75% (target: 73%)
- ⚠️ Lint: 20 warnings remaining
- 🚧 Active development on `salvage/slack-tests` branch