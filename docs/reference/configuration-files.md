# Technical Configuration Reference

This document provides a comprehensive reference for all root-level technical configuration files in the Open-Hivemind project.

## Table of Contents

- [1. Project Manifest](#1-project-manifest)
- [2. TypeScript Configuration](#2-typescript-configuration)
- [3. Build & Transpilation](#3-build--transpilation)
- [4. Code Quality](#4-code-quality)
- [5. Testing](#5-testing)
- [6. Build Automation](#6-build-automation)
- [7. Containerization](#7-containerization)
- [8. Deployment](#8-deployment)
- [9. Other Configuration Files](#9-other-configuration-files)

---

## 1. Project Manifest

### `package.json`

**Purpose**: Defines the project metadata, dependencies, scripts, and npm package configuration.

**Key Configuration Options**:

```json
{
  "name": "open-hivemind",
  "type": "commonjs",
  "workspaces": ["src/client", "packages/*"]
}
```

| Option | Value | Description |
|--------|-------|-------------|
| `type` | `commonjs` | Module system used (CommonJS for Node.js compatibility) |
| `workspaces` | `["src/client", "packages/*"]` | npm workspaces for monorepo structure |
| `bin.hivemind` | `dist/src/cli/HivemindCLI.js` | CLI entry point for global installation |

**Scripts Overview**:

| Category | Script | Purpose |
|----------|--------|---------|
| **Development** | `start:dev` | TypeScript dev with ts-node and tsconfig-paths |
| **Development** | `dev:webui-only` | WebUI development without messengers (`SKIP_MESSENGERS=true`) |
| **Build** | `build` | Full build (frontend + backend) via `./scripts/build-all.sh` |
| **Build** | `build:frontend` | Vite build for React frontend |
| **Build** | `build:backend` | TypeScript compilation to `dist/` |
| **Quality** | `lint` | ESLint check on `src/` |
| **Quality** | `lint:fix` | ESLint with auto-fix |
| **Quality** | `format` | Prettier format all TypeScript files |
| **Testing** | `test` | Jest unit + integration tests with test config |
| **Testing** | `test:coverage` | Jest with coverage report |
| **Testing** | `test:real` | Real API integration tests |
| **Testing** | `test:playwright` | E2E tests with Playwright |

**Module Aliases (`_moduleAliases`)**:

Production path mapping used by `module-alias` package at runtime:

```json
{
  "@src": "dist/src",
  "@command": "dist/src/command",
  "@common": "dist/src/common",
  "@config": "dist/src/config",
  "@llm": "dist/src/llm",
  "@message": "dist/src/message",
  "@integrations": "dist/src/integrations",
  "@hivemind/provider-openai": "dist/packages/provider-openai/src",
  "@hivemind/adapter-discord": "dist/packages/adapter-discord/src"
}
```

**When to Modify**:
- Adding new npm scripts for build/test automation
- Installing new dependencies
- Adding new workspace packages
- Updating module aliases for new path mappings

---

## 2. TypeScript Configuration

### `tsconfig.json`

**Purpose**: Primary TypeScript compiler configuration for the project.

**Key Configuration Options**:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "lib": ["es2021", "dom"],
    "module": "CommonJS",
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": "./",
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "incremental": true,
    "skipLibCheck": true,
    "noEmitOnError": false,
    "jsx": "react",
    "paths": {
      "@command/*": ["src/command/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"],
      "@src/*": ["src/*"]
    }
  }
}
```

| Option | Value | Description |
|--------|-------|-------------|
| `target` | `es2018` | JavaScript output target version |
| `module` | `CommonJS` | Module code generation |
| `strict` | `false` | Disables all strict type-checking options |
| `noImplicitAny` | `false` | Allows expressions with implicit `any` type |
| `noImplicitReturns` | `true` | Ensures all code paths return a value |
| `esModuleInterop` | `true` | Enables interoperability between CommonJS and ES modules |
| `skipLibCheck` | `true` | Skips type checking of declaration files |
| `noEmitOnError` | `false` | Generates output even with type errors |
| `incremental` | `true` | Enables incremental compilation for faster builds |
| `jsx` | `react` | JSX code generation mode |

**Path Mappings**:

| Alias | Maps To |
|-------|---------|
| `@command/*` | `src/command/*` |
| `@common/*` | `src/common/*` |
| `@config/*` | `src/config/*` |
| `@llm/*` | `src/llm/*` |
| `@message/*` | `src/message/*` |
| `@integrations/*` | `src/integrations/*` |
| `@hivemind/adapter-*` | `packages/adapter-*/src/*` |
| `@hivemind/provider-openai` | `packages/provider-openai/src/*` |

**When to Modify**:
- Enabling stricter type checking (change `strict` to `true`)
- Adding new path aliases for module imports
- Changing output target for newer Node.js versions
- Adding new `typeRoots` for custom type definitions

### `tsconfig.paths.json`

**Purpose**: Standalone path aliases configuration that can be extended by other configs.

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@command/*": ["src/command/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"],
      "@src/*": ["src/*"],
      "@client/*": ["src/client/*"],
      "@server/*": ["src/server/*"]
    }
  }
}
```

**Relationship to Other Files**:
- Imported by `tsconfig.json` implicitly through inclusion
- Used by `ts-node` with `-r tsconfig-paths/register`

**When to Modify**:
- When adding new module path aliases that need to be shared across multiple configs

---

## 3. Build & Transpilation

### `babel.config.js`

**Purpose**: Babel transpiler configuration for Jest tests and JSX/TypeScript processing.

```javascript
module.exports = {
  "presets": [
    ["@babel/preset-env", { "targets": { "node": "current" } }],
    "@babel/preset-typescript",
    ["@babel/preset-react", { "runtime": "automatic" }]
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    ["@babel/plugin-proposal-class-properties", { "loose": true }],
    "@babel/plugin-transform-object-rest-spread"
  ]
};
```

| Preset/Plugin | Purpose |
|---------------|---------|
| `@babel/preset-env` | Transpiles modern JavaScript for current Node version |
| `@babel/preset-typescript` | Transpiles TypeScript without type checking |
| `@babel/preset-react` | Transpiles JSX (with automatic runtime) |
| `@babel/plugin-proposal-decorators` | Supports legacy decorator syntax |
| `@babel/plugin-proposal-class-properties` | Supports class field declarations |
| `@babel/plugin-transform-object-rest-spread` | Supports spread operator in objects |

**Relationship to Other Files**:
- Used by `jest.config.js` via `babel-jest` transformer
- Complements `tsconfig.json` (which handles type checking)

**When to Modify**:
- Adding support for newer JavaScript features in tests
- Changing React JSX transform mode
- Adding experimental decorators or class properties support

---

## 4. Code Quality

### `eslint.config.js`

**Purpose**: ESLint v9 flat configuration for linting TypeScript and JavaScript files.

**Structure**:

```javascript
module.exports = [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'src/client/**', // Client has its own config
    ],
  },
  // TypeScript files configuration
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: { parser: typescriptParser, ... },
    plugins: { '@typescript-eslint': ..., prettier: ... },
    rules: { ... }
  },
  // JavaScript files configuration
  { ... },
  // Test files - relaxed rules
  { ... },
  // Prettier config override
  eslintConfigPrettier,
];
```

**Key Rules**:

| Rule | Level | Description |
|------|-------|-------------|
| `prettier/prettier` | error | Enforces Prettier formatting |
| `indent` | error | 2-space indentation |
| `quotes` | error | Single quotes |
| `semi` | error | Semicolons required |
| `no-debugger` | error | Prevents debugger statements |
| `@typescript-eslint/no-unused-vars` | warn | Warns on unused variables |
| `@typescript-eslint/no-explicit-any` | warn | Warns on `any` type usage |
| `no-console` | warn | Warns on console statements |

**When to Modify**:
- Adjusting rule severity for code style enforcement
- Adding new file patterns to ignore
- Changing TypeScript parser options
- Modifying Prettier integration

### `.prettierrc.json`

**Purpose**: Prettier code formatter configuration.

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["@ianvs/prettier-plugin-sort-imports"],
  "importOrder": [
    "^@(?!src|client|config|...)(.*)$",
    "^@src/(.*)$",
    "^@client/(.*)$",
    "..."
  ]
}
```

| Option | Value | Description |
|--------|-------|-------------|
| `semi` | `true` | Adds semicolons at statement ends |
| `singleQuote` | `true` | Uses single quotes instead of double |
| `tabWidth` | `2` | Number of spaces per indentation |
| `trailingComma` | `es5` | Trailing commas where valid in ES5 |
| `printWidth` | `100` | Line length before wrapping |
| `endOfLine` | `lf` | Unix-style line endings |

**Import Sorting**:

Imports are sorted in this order:
1. External packages (not starting with `@src`, `@client`, etc.)
2. `@src/*` imports
3. `@client/*` imports
4. `@config/*` imports
5. Other `@*` aliases
6. Relative imports (`./` or `../`)

**Relationship to Other Files**:
- Referenced by `eslint.config.js` via `eslint-plugin-prettier`
- Used by `npm run format` script in `package.json`

**When to Modify**:
- Changing code formatting preferences
- Adjusting `printWidth` for different screen sizes
- Adding new import order categories

### `.prettierignore`

**Purpose**: Excludes files and directories from Prettier formatting.

```
# Build outputs
dist/
build/
coverage/
*.min.js

# Dependencies
node_modules/

# Generated files
src/client/dist/
**/*.generated.ts

# Config files that should not be reformatted
config/

# Test snapshots
**/*.snap
```

**When to Modify**:
- Adding new build output directories
- Excluding generated files from formatting
- Adding configuration files that must preserve specific formatting

### `.eslintrc.js`

**Purpose**: Legacy ESLint configuration (deprecated, kept for backwards compatibility).

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
```

**Status**: Deprecated in favor of `eslint.config.js` (flat config).

**When to Modify**:
- **Do not modify** - migrate any changes to `eslint.config.js` instead
- Remove this file once all tools support ESLint v9 flat config

---

## 5. Testing

### `jest.config.js`

**Purpose**: Jest test runner configuration with three test projects.

**Structure**:

```javascript
const unitIntegrationProject = { ... };
const realIntegrationProject = { ... };
const projects = [
  unitIntegrationProject,
  { displayName: 'frontend', testEnvironment: 'jsdom', ... }
];
if (process.env.RUN_REAL_TESTS === 'true') {
  projects.push(realIntegrationProject);
}
```

**Test Projects**:

| Project | Display Name | Environment | Test Pattern |
|---------|--------------|-------------|--------------|
| Unit/Integration | `unit-integration` | `node` | `*.test.ts`, `*.integration.test.ts` |
| Frontend | `frontend` | `jsdom` | `*.test.ts` in `src/client` |
| Real Integration | `real-integration` | `node` | `*.real.test.ts` |

**Key Configuration Options**:

| Option | Description |
|--------|-------------|
| `preset: 'ts-jest'` | TypeScript support via ts-jest |
| `testEnvironment: 'node'` | Node.js environment for backend tests |
| `testEnvironment: 'jsdom'` | Browser environment for frontend tests |
| `transform` | Uses `babel-jest` for TypeScript/JSX |
| `moduleNameMapper` | Path alias resolution |
| `collectCoverage: true` | Enables coverage collection |

**Module Mappings**:

```javascript
moduleNameMapper: {
  '^@src/(.*)$': '<rootDir>/src/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^@slack/web-api$': '<rootDir>/tests/mocks/slackWebApiMock.js',
  'sqlite$': '<rootDir>/tests/mocks/sqlite.ts',
  'bcrypt$': '<rootDir>/tests/mocks/bcrypt.ts',
  'discord.js': '<rootDir>/tests/__mocks__/discord.js.ts'
}
```

**Environment Variables**:

| Variable | Purpose |
|----------|---------|
| `RUN_REAL_TESTS=true` | Includes real integration tests project |
| `RUN_SYSTEM_TESTS=true` | Uses real Discord.js instead of mock |
| `NODE_CONFIG_DIR=config/test/` | Isolates test configuration |

**When to Modify**:
- Adding new path aliases for module resolution
- Changing test file patterns
- Adding new mock modules
- Adjusting coverage settings

### `playwright.config.ts`

**Purpose**: Playwright E2E test configuration for browser testing.

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  outputDir: 'test-results',
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3028',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3028',
    reuseExistingServer: !process.env.CI,
  },
});
```

| Option | Value | Description |
|--------|-------|-------------|
| `testDir` | `./tests/e2e` | Location of E2E test files |
| `fullyParallel` | `true` | Run tests in parallel |
| `timeout` | `60000` | Test timeout in milliseconds |
| `retries` | `2` (CI) / `0` (local) | Retry failed tests |

**Browser Projects**:

| Project | Device |
|---------|--------|
| `chromium` | Desktop Chrome |
| `firefox` | Desktop Firefox |
| `webkit` | Desktop Safari |

**Reporters**:

| Environment | Reporters |
|-------------|-----------|
| CI | HTML, JSON, JUnit, Line, GitHub |
| Local | HTML (on failure), Line |

**When to Modify**:
- Adding new browser/device projects
- Changing base URL for different environments
- Adjusting timeouts for slower tests
- Adding new global setup/teardown hooks

---

## 6. Build Automation

### `Makefile`

**Purpose**: Provides convenient commands for development, build, test, and quality gates.

**Primary Targets**:

| Target | Purpose |
|--------|---------|
| `make start-dev` | Unified development server with ts-node and tsconfig-paths |
| `make start-prod` | Production server with compiled code |
| `make build` | Full build (frontend + backend) |
| `make lint` | Run ESLint |
| `make test` | Run Jest tests |
| `make quality` | Run lint + build checks |
| `make ci` | Full CI pipeline (lint + build + test) |
| `make clean` | Kill processes and clean builds |

**Development Workflow**:

```bash
# Start development
make start-dev

# Run quality checks
make quality

# Full CI simulation
make ci

# Clean everything
make clean
```

**Build Process** (`make build`):

1. Build frontend: `vite build` in `src/client`
2. Build backend: `tsc` compilation
3. Copy assets: Scripts, config, frontend dist

**Feature Detection**:

```makefile
UV := $(shell command -v uv 2>/dev/null)
ifeq ($(UV),)
  RUN := npm
else
  RUN := uv run -q
endif
```

**When to Modify**:
- Adding new build targets
- Changing development server commands
- Adding new quality gate checks
- Modifying clean targets

---

## 7. Containerization

### `Dockerfile`

**Purpose**: Multi-stage Docker build for production deployment.

```dockerfile
FROM node:22-alpine

# Feature flags
ARG INCLUDE_PYTHON_TOOLS=true
ARG INCLUDE_NODE_TOOLS=true
ARG INCLUDE_FFMPEG=true

# Install system dependencies
RUN apk add --no-cache curl bash python3 py3-pip ...

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

| Build Arg | Default | Description |
|-----------|---------|-------------|
| `INCLUDE_PYTHON_TOOLS` | `true` | Installs Python 3, pip, and uv |
| `INCLUDE_NODE_TOOLS` | `true` | Installs global npm tools (npx, MCP CLI) |
| `INCLUDE_FFMPEG` | `true` | Installs ffmpeg for Discord voice |

**Build Stages**:

1. **Base**: Node.js 22 Alpine
2. **Dependencies**: Install system packages based on feature flags
3. **Install**: `npm ci` for dependencies
4. **Build**: `npm run build` and prune dev dependencies
5. **Runtime**: Expose port 3000 with health check

**When to Modify**:
- Changing Node.js version
- Adding new system dependencies
- Enabling/disabling feature flags
- Modifying health check endpoint

### `docker-compose.yml`

**Purpose**: Production Docker Compose orchestration with monitoring.

```yaml
version: '3.8'
services:
  hivemind:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
```

**Services**:

| Service | Port | Purpose |
|---------|------|---------|
| `hivemind` | 3000 | Main application |
| `prometheus` | 9090 | Metrics collection |
| `grafana` | 3001 | Metrics visualization |

**Volumes**:

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `./config` | `/app/config:ro` | Configuration files (read-only) |
| `./logs` | `/app/logs` | Application logs |
| `grafana-storage` | `/var/lib/grafana` | Grafana persistent data |

**When to Modify**:
- Adding new services (databases, caches)
- Changing port mappings
- Adding environment variables
- Modifying volume mounts

### `docker-compose.local.yaml`

**Purpose**: Local development Docker Compose override.

```yaml
services:
  open-hivemind-agent:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3020:3020"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./config:/config
    logging:
      driver: json-file
      options:
        max-size: "100k"
        max-file: "3"
```

**Differences from Production**:

| Aspect | Local | Production |
|--------|-------|------------|
| Port | 3020 | 3000 |
| Logging | JSON file with rotation | Default |
| Monitoring | None | Prometheus + Grafana |
| Service Name | `open-hivemind-agent` | `hivemind` |

**When to Modify**:
- Changing local development port
- Adding local-only services
- Adjusting logging configuration

---

## 8. Deployment

### `fly.toml`

**Purpose**: Fly.io deployment configuration.

```toml
app = 'open-hivemind'
primary_region = 'syd'

[build]
  image = 'mhand79/open-hivemind'
  [build.args]
    BUILD_TIMESTAMP = "1736856000"

[env]
  PORT = '5005'

[http_service]
  internal_port = 5005
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 1
  processes = ['app']

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

| Section | Key | Value | Description |
|---------|-----|-------|-------------|
| App | `app` | `open-hivemind` | Fly.io app name |
| App | `primary_region` | `syd` | Primary deployment region (Sydney) |
| Build | `image` | `mhand79/open-hivemind` | Docker Hub image |
| Build | `BUILD_TIMESTAMP` | Unix timestamp | Cache-busting build arg |
| Env | `PORT` | `5005` | Internal port for the app |
| HTTP Service | `internal_port` | `5005` | Port exposed by the app |
| HTTP Service | `force_https` | `true` | Redirect HTTP to HTTPS |
| HTTP Service | `auto_stop_machines` | `stop` | Stop machines when idle |
| HTTP Service | `auto_start_machines` | `true` | Start machines on request |
| VM | `memory` | `256mb` | Allocated memory |
| VM | `cpu_kind` | `shared` | Shared CPU |
| VM | `cpus` | `1` | Number of CPUs |

**Auto-scaling Behavior**:

- Minimum 1 machine always running
- Maximum 1 machine (no horizontal scaling)
- Machines stop when idle to save costs
- Machines auto-start on incoming requests

**When to Modify**:
- Changing deployment region
- Updating Docker image
- Adjusting VM resources (memory/CPU)
- Modifying auto-scaling behavior

---

## 9. Other Configuration Files

### `.gitignore`

**Purpose**: Excludes files and directories from Git version control.

**Key Patterns**:

```gitignore
# Logs
logs
*.log
npm-debug.log*

# Dependencies
node_modules/

# Build outputs
dist
.next
out

# Environment files
.env
.env.*

# Test coverage
coverage
.nyc_output

# Sensitive configuration
config/user/
config/providers/
.env.real
*.config.json
*credentials*
*secrets*

# IDE
.vscode/settings.json

# Generated files
**/*.generated.ts

# Playwright
test-results/
playwright-report/
```

**Sensitive Data Exclusions**:

| Pattern | Reason |
|---------|--------|
| `config/user/` | User-specific overrides |
| `config/providers/` | Provider credentials |
| `.env.real` | Real environment variables |
| `*credentials*` | Credential files |
| `*secrets*` | Secret files |

**When to Modify**:
- Adding new build output directories
- Excluding IDE-specific files
- Adding sensitive file patterns
- Ignoring new generated file types

### `.dockerignore`

**Purpose**: Excludes files from Docker build context to reduce image size and build time.

```gitignore
# Dependency directories
node_modules

# TypeScript compiled output
dist

# Environment files
.env
.env.*

# Logs
*.log

# Coverage
coverage
.nyc_output

# Build tools
.grunt
bower_components
```

**Relationship to `.gitignore`**:

Similar but more restrictive - excludes files not needed for building the Docker image:
- Both exclude `node_modules` and `dist`
- `.dockerignore` excludes less (no IDE files, for example)
- Focus on reducing build context size

**When to Modify**:
- Adding large directories that aren't needed in Docker builds
- Excluding test files from production builds
- Reducing build context size for faster builds

---

## Configuration Relationships

### Development Workflow

```
package.json scripts
    ↓
Makefile targets (start-dev, build)
    ↓
ts-node + tsconfig-paths (development)
    ↓
tsconfig.json (path resolution)
```

### Build Pipeline

```
make build
    ├── npm run build:frontend → vite build
    └── npm run build:backend → tsc
            ↓
        babel.config.js (test transpilation)
            ↓
        dist/ output
```

### Quality Gates

```
make ci
    ├── make lint → eslint.config.js
    ├── make build → tsconfig.json + babel
    └── make test → jest.config.js + playwright.config.ts
```

### Path Resolution Chain

```
Source Import: @config/messageConfig
    ↓
TypeScript (tsconfig.json): "@config/*": ["src/config/*"]
    ↓
Development (ts-node): tsconfig-paths/register
    ↓
Production (module-alias): package.json "_moduleAliases"
    ↓
Tests (Jest): jest.config.js "moduleNameMapper"
```

---

## Quick Reference: When to Modify Each File

| File | Modify When... |
|------|----------------|
| `package.json` | Adding dependencies, scripts, or workspaces |
| `tsconfig.json` | Changing TypeScript compiler options or path aliases |
| `tsconfig.paths.json` | Adding shared path alias configurations |
| `babel.config.js` | Adding JavaScript/TypeScript transpilation features |
| `eslint.config.js` | Adjusting linting rules or file patterns |
| `.prettierrc.json` | Changing code formatting preferences |
| `.prettierignore` | Excluding files from formatting |
| `jest.config.js` | Adding test projects, mocks, or path mappings |
| `playwright.config.ts` | Changing E2E browsers or test settings |
| `Makefile` | Adding build targets or modifying dev commands |
| `Dockerfile` | Changing Node version, dependencies, or build process |
| `docker-compose.yml` | Adding production services or volumes |
| `docker-compose.local.yaml` | Modifying local dev container setup |
| `fly.toml` | Changing Fly.io deployment settings |
| `.gitignore` | Excluding files from version control |
| `.dockerignore` | Excluding files from Docker build context |
