# Contributing

We welcome contributions! Please follow these guidelines to help us maintain the quality and integrity of the project.

## Table of Contents
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Development Guidelines](#development-guidelines)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- **Node.js v18 or later** (check with `node -v`)
- **npm** (comes with Node.js)
- **Git** for version control

### Fork and Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button in the top-right corner
2. **Clone your fork** to your local machine:
   ```bash
   git clone https://github.com/your-username/open-hivemind.git
   cd open-hivemind
   ```
3. **Set up the upstream remote**:
   ```bash
   git remote add upstream https://github.com/matthewhand/open-hivemind.git
   ```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy the sample environment file and configure your credentials:

```bash
cp .env.sample .env
```

Edit `.env` to add your Discord, Slack, Mattermost, and LLM provider tokens. See [Configuration Overview](../configuration/overview.md) for details.

---

## How to Contribute

### Types of Contributions

We welcome the following types of contributions:

- **Bug fixes** – Fix issues reported in GitHub Issues
- **Feature implementations** – Add new capabilities to the bot ecosystem
- **Documentation improvements** – Fix typos, clarify explanations, add examples
- **Performance optimizations** – Improve speed or reduce resource usage
- **Test coverage** – Add tests for untested code paths
- **Platform integrations** – Add support for new messaging platforms

### Reporting Issues

Before opening a new issue:

1. **Search existing issues** to avoid duplicates
2. **Use the appropriate template** (bug report, feature request, etc.)
3. **Provide minimal reproduction steps** for bugs
4. **Include environment details**: Node version, OS, relevant config (redact secrets)

### Feature Requests

For new features:

1. **Open a discussion first** for significant changes
2. **Describe the use case** – why is this feature needed?
3. **Propose an implementation approach** if you have ideas
4. **Wait for maintainer feedback** before investing significant time

---

## Code of Conduct

### Our Standards

- **Be respectful** – Treat all contributors with respect and professionalism
- **Be constructive** – Provide helpful feedback and accept it gracefully
- **Be inclusive** – Welcome newcomers and help them get started
- **Be patient** – Maintainers are volunteers; responses may take time
- **Be clear** – Write descriptive commit messages and PR descriptions

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Trolling, insulting/derogatory comments, or personal/political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

### Enforcement

Violations may result in temporary or permanent ban from the project.

---

## Development Guidelines

### Project Architecture

Open-Hivemind is a TypeScript-based multi-agent bot ecosystem with:

- **Plugin-based architecture** – Adapters and providers are dynamically loaded from separate packages, not compiled into core code
- **Monorepo structure** – Main code in `src/`, plugin packages in `packages/`
- **Configuration layers** – Environment variables → WebUI overrides → static files → personas

**Key architectural principle**: The core application knows nothing about Discord, Slack, OpenAI, or Flowise implementations. These are loaded at runtime via `require()` based on `MESSAGE_PROVIDER` and `LLM_PROVIDER` configuration. This enables hot-swapping backends without code changes.

See [Architecture Overview](../architecture/development.md) for detailed patterns including:
- Dynamic loading of adapters/providers
- Interface contracts (`ILlmProvider`, `IAdapterFactory`)
- Adding new platforms or LLM backends

### Code Style Requirements

We enforce strict code style via ESLint and Prettier. **All code must pass linting before merging.**

#### Running Checks

```bash
# Check for linting issues
npm run lint

# Check formatting
npm run format:check

# Auto-fix linting issues
npm run lint:fix

# Auto-format code
npm run format
```

#### Key Style Rules

| Aspect | Rule |
|--------|------|
| **Indentation** | 2 spaces (no tabs) |
| **Quotes** | Single quotes (`'string'`) |
| **Semicolons** | Required at end of statements |
| **Trailing commas** | ES5-compatible only (arrays, objects) |
| **Braces** | Required for all control statements |
| **Line width** | 100 characters max |

See [Code Style Guide](../CODE_STYLE.md) for complete conventions.

### TypeScript Standards

- **Strict typing** – Avoid `any`; use proper types
- **Interface naming** – Prefix with `I` for public APIs (`IMessage`)
- **Explicit return types** – Declare return types on public methods
- **Type imports** – Use `import type { IMessage }` for type-only imports

### Import Order

Organize imports in this order, separated by blank lines:

1. **Node.js built-ins** (`fs`, `path`, `http`)
2. **External packages** (`express`, `discord.js`)
3. **Internal aliases** (`@src`, `@config`, `@integrations`)
4. **Relative imports** (`./`, `../`)

### Testing Requirements

All changes should include appropriate tests:

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Debug mode (verbose logging)
npm run test:debug

# Real integration tests (requires credentials)
npm run test:real
```

#### Testing Best Practices

- **Reset modules** between tests that modify configuration:
  ```typescript
  jest.resetModules();
  const mod = require('@integrations/discord/DiscordService');
  ```
- **Snapshot/restore environment** to prevent cross-test leakage:
  ```typescript
  const ORIGINAL_ENV = { ...process.env };
  // ... modify env ...
  process.env = ORIGINAL_ENV;
  ```
- **Mock external services** – Don't hit real APIs in unit tests

### Documentation

- **JSDoc for public APIs** – All classes, methods, and interfaces
- **Explain "why", not "what"** – Inline comments should clarify intent
- **Update relevant docs** – If you change behavior, update the docs

Example JSDoc:
```typescript
/**
 * Sends a message to the specified channel.
 *
 * @param channelId - The ID of the target channel
 * @param content - The message content to send
 * @returns A promise that resolves when the message is sent
 * @throws {Error} If the channel is not found
 */
async sendMessage(channelId: string, content: string): Promise<void> {
  // implementation
}
```

### Debugging

Enable extended logging during development:

```bash
DEBUG=app:* npm run dev
```

Common debug namespaces:
- `app:discordService` – Discord client events
- `app:BotConfigurationManager` – Config resolution
- `app:*` – All application logs

---

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run validation**:
   ```bash
   npm run validate  # Runs lint + test
   ```

3. **Ensure tests pass** – All existing tests must pass

4. **Update documentation** – If your change affects behavior

### PR Guidelines

1. **Create a feature branch** – Don't submit from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Write clear commit messages**:
   - Use present tense ("Add feature" not "Added feature")
   - Use imperative mood ("Move cursor to..." not "Moves cursor to...")
   - Limit first line to 72 characters
   - Reference issues: "Fixes #123"

3. **Fill out the PR template** – Describe what changed and why

4. **Keep changes focused** – One logical change per PR

5. **Ensure CI passes** – All checks must be green before review

### Review Process

1. **Maintainer review** – At least one maintainer must approve
2. **Address feedback** – Make requested changes promptly
3. **Squash if requested** – Clean up commit history if asked
4. **Merge** – Maintainers will merge when ready

### After Merge

- Your contribution will be included in the next release
- You'll be credited in the release notes
- Consider updating your fork's main branch

---

## Questions?

- **Discord**: Join our community Discord (link in repo README)
- **GitHub Discussions**: For questions and general discussion
- **Issues**: For bug reports and feature requests

Thank you for contributing to Open-Hivemind!
