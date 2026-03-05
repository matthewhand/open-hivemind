# Code Style Guide

This document defines the code style and naming conventions for the Open-Hivemind project.

## Table of Contents

1. [Code Formatting](#code-formatting)
2. [Naming Conventions](#naming-conventions)
3. [File Organization](#file-organization)
4. [Import Order](#import-order)
5. [Documentation](#documentation)

## Code Formatting

### Indentation

- Use **2 spaces** for indentation (no tabs)
- Use 2 spaces for switch case indentation

```typescript
// Correct
function example() {
  switch (value) {
    case 'a':
      doSomething();
      break;
  }
}
```

### Quotes

- Use **single quotes** for strings
- Use double quotes only when the string contains single quotes
- Template literals are allowed for string interpolation

```typescript
// Correct
const name = 'open-hivemind';
const message = "It's a test";
const greeting = `Hello, ${name}!`;
```

### Semicolons

- Always use semicolons at the end of statements

```typescript
// Correct
const x = 1;
doSomething();
```

### Trailing Commas

- Use trailing commas in ES5-compatible locations (arrays, objects, multi-line)
- Do not use trailing commas in function parameters

```typescript
// Correct
const obj = {
  a: 1,
  b: 2,
};

const arr = [
  1,
  2,
  3,
];

// Incorrect
function foo(
  a,
  b, // No trailing comma in function parameters
) {}
```

### Braces

- Use curly braces for all control statements
- Opening brace on same line

```typescript
// Correct
if (condition) {
  doSomething();
}

// Incorrect
if (condition) doSomething();
```

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| TypeScript classes | PascalCase.ts | `BotManager.ts` |
| TypeScript interfaces | PascalCase.ts | `IMessage.ts` |
| TypeScript types | PascalCase.ts | `MessageTypes.ts` |
| TypeScript utilities | camelCase.ts | `formatDate.ts` |
| React components | PascalCase.tsx | `Dashboard.tsx` |
| Test files | originalName.test.ts | `BotManager.test.ts` |
| Configuration files | kebab-case.json | `discord-config.json` |
| Constants files | UPPER_SNAKE_CASE.ts | `ERROR_CODES.ts` |

### Directories

| Type | Convention | Example |
|------|------------|---------|
| Feature directories | kebab-case | `message-handlers/` |
| Component directories | PascalCase | `components/Dashboard/` |
| Integration directories | lowercase | `discord/`, `slack/` |
| Utility directories | lowercase | `utils/`, `helpers/` |

### Code Identifiers

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `class BotManager` |
| Interfaces | PascalCase with I prefix | `interface IMessage` |
| Type aliases | PascalCase | `type MessageHandler` |
| Functions | camelCase | `function processMessage()` |
| Methods | camelCase | `sendMessage()` |
| Variables | camelCase | `const botConfig` |
| Constants | UPPER_SNAKE_CASE | `const MAX_RETRIES` |
| Private members | underscore prefix | `_privateField` |
| Enum values | PascalCase | `enum Status { Active, Inactive }` |

### Interface Naming

- Prefix interfaces with `I` for public APIs
- Use descriptive names that indicate purpose

```typescript
// Correct
export interface IMessage {
  content: string;
  author: string;
}

export interface IMessageHandler {
  handle(message: IMessage): Promise<void>;
}

// For internal types, I prefix is optional
export type MessageCallback = (message: IMessage) => void;
```

## File Organization

### Directory Structure

```
src/
├── auth/              # Authentication and authorization
├── client/            # Frontend React application
├── command/           # Command handlers
├── common/            # Shared utilities and helpers
├── config/            # Configuration management
├── integrations/      # External service integrations
│   ├── discord/
│   ├── slack/
│   └── mattermost/
├── llm/               # LLM provider implementations
├── message/           # Message handling and routing
├── server/            # Express server and routes
├── types/             # TypeScript type definitions
└── webhook/           # Webhook handlers
```

### File Contents

Each TypeScript file should follow this structure:

```typescript
// 1. Imports (see Import Order section)

// 2. Type/Interface definitions
interface IExample {
  // ...
}

// 3. Constants
const DEFAULT_VALUE = 'default';

// 4. Class/Function definitions
export class Example {
  // ...
}

// 5. Default export (if applicable)
export default Example;
```

## Import Order

Imports should be organized in the following order, separated by blank lines:

1. **Node.js built-in modules** (fs, path, http, etc.)
2. **External packages** (express, discord.js, etc.)
3. **Internal aliases** (@src, @config, @integrations, etc.)
4. **Relative imports** (./, ../)

```typescript
// 1. Node.js built-ins
import fs from 'fs';
import path from 'path';

// 2. External packages
import express from 'express';
import { Client } from 'discord.js';

// 3. Internal aliases
import { BotManager } from '@src/bot/BotManager';
import { config } from '@config/ConfigurationManager';
import { DiscordService } from '@integrations/discord/DiscordService';

// 4. Relative imports
import { helper } from './utils/helper';
import { localConfig } from '../config/local';
```

### Type Imports

Use inline type imports for type-only imports:

```typescript
// Correct
import { type IMessage, type IMessageHandler } from '@message/interfaces/IMessage';
import { config } from '@config/ConfigurationManager';

// Also acceptable
import type { IMessage } from '@message/interfaces/IMessage';
```

## Documentation

### JSDoc Comments

All public methods, classes, and interfaces should have JSDoc documentation.

#### Classes

```typescript
/**
 * Manages bot lifecycle and configuration.
 * 
 * @example
 * ```typescript
 * const manager = new BotManager();
 * await manager.initialize();
 * ```
 */
export class BotManager {
  // ...
}
```

#### Methods

```typescript
/**
 * Sends a message to the specified channel.
 * 
 * @param channelId - The ID of the target channel
 * @param content - The message content to send
 * @returns A promise that resolves when the message is sent
 * @throws {Error} If the channel is not found
 * 
 * @example
 * ```typescript
 * await sendMessage('123456789', 'Hello, world!');
 * ```
 */
async sendMessage(channelId: string, content: string): Promise<void> {
  // ...
}
```

#### Interfaces

```typescript
/**
 * Represents a message from any supported platform.
 * 
 * @property content - The text content of the message
 * @property author - The user who sent the message
 * @property channelId - The channel where the message was sent
 */
export interface IMessage {
  content: string;
  author: IUser;
  channelId: string;
}
```

#### Properties

```typescript
class Example {
  /** The maximum number of retry attempts */
  private readonly maxRetries: number;
  
  /** Whether the bot is currently connected */
  public isConnected: boolean;
}
```

### Inline Comments

- Use inline comments sparingly
- Explain "why", not "what"
- Keep comments up-to-date with code changes

```typescript
// Correct: Explains why
// Delay to avoid rate limiting (Discord allows 50 requests/second)
await delay(20);

// Incorrect: Explains what (obvious from code)
// Increment counter
counter++;
```

## Running Linting and Formatting

### Check for Issues

```bash
npm run lint           # Check for linting issues
npm run format:check   # Check for formatting issues
```

### Fix Issues

```bash
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks that automatically:
1. Run ESLint on staged files
2. Format code with Prettier
3. Run related tests

## Configuration Files

| File | Purpose |
|------|---------|
| `.prettierrc.json` | Prettier formatting configuration |
| `.prettierignore` | Files to exclude from Prettier |
| `eslint.config.js` | ESLint linting configuration |
| `tsconfig.json` | TypeScript compiler configuration |

## Editor Setup

### VS Code

Install the following extensions:
- ESLint
- Prettier - Code formatter
- TypeScript Hero (for import sorting)

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```
