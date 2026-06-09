# OpenHivemind Test Strategy

## Test Pyramid Architecture

```
        /\
       /  \      E2E Tests (5%)
      /    \     Browser automation, full workflows
     /------\
    /        \   Integration Tests (20%)
   /          \  API contracts, service boundaries
  /------------\
 /              \ Unit Tests (70%)
/                \ Business logic, edge cases, mocks
------------------
```

## Test Level Definitions

### 1. Unit Tests (70% of test suite)
**Purpose:** Test business logic in isolation
**Location:** `tests/unit/` and `tests/test_*.ts`
**Characteristics:**
- Fast (< 100ms per test)
- No I/O, network, or external dependencies
- Heavy use of mocks and fixtures
- Test one concept per test

**Patterns:**
```typescript
describe('UserService', () => {
  it('should validate email format', () => {
    // Arrange
    const service = new UserService();

    // Act
    const result = service.validateEmail('test@example.com');

    // Assert
    expect(result).toBe(true);
  });
});
```

### 2. Integration Tests (20% of test suite)
**Purpose:** Test component interactions and API contracts
**Location:** `tests/integration/`
**Characteristics:**
- Test real service boundaries
- Use real (lightweight) dependencies or test containers
- May use temporary databases
- Focus on API contracts and service interactions

**Patterns:**
```typescript
describe('Bot API Integration', () => {
  it('should create a bot and return 201', async () => {
    // Arrange
    const botData = { name: 'TestBot', provider: 'openai' };

    // Act
    const response = await request(app).post('/api/bots').send(botData);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('TestBot');
  });
});
```

### 3. Smoke Tests (5% of test suite)
**Purpose:** Verify critical paths work in production-like environment
**Location:** `tests/smoke/`
**Characteristics:**
- Minimal but critical coverage
- Fast to run (< 2 min) – CI/CD gate
- Test happy paths only
- May run against staging

**Patterns:**
```typescript
// tests/smoke/critical-path.test.ts
describe('Smoke Tests', () => {
  it('app health check passes', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('bot can be created and responds', async () => {
    const bot = await createTestBot();
    const res = await request(app).post('/api/bots').send(bot);
    expect(res.status).toBe(201);
  });

  it('auth flow works (login → token → protected route)', async () => {
    const login = await request(app).post('/auth/login').send(credentials);
    expect(login.status).toBe(200);
    const token = login.body.token;
    const protected = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    expect(protected.status).toBe(200);
  });
});
```

**Smoke Test Checklist:**
- [ ] App starts without errors
- [ ] Health endpoint returns 200
- [ ] Database connects and migrations run
- [ ] Auth flow works (login → token → protected route)
- [ ] Core API endpoints respond (config, bots, health)
- [ ] Frontend loads without JS errors

### 4. E2E Tests (5% of test suite)
**Purpose:** Test complete user workflows
**Location:** `tests/e2e/`
**Characteristics:**
- Browser automation (Playwright)
- Full stack testing
- Slow but comprehensive
- Test critical user journeys

## DRY Principles for Tests

### 1. Shared Fixtures Structure

```
tests/
├── conftest.ts              # Root fixtures (applies to all)
├── unit/
│   └── conftest.ts          # Unit-specific fixtures
├── integration/
│   └── conftest.ts          # Integration fixtures (DB, API client)
├── e2e/
│   └── conftest.ts          # E2E fixtures (browser, live server)
└── smoke/
    └── conftest.ts          # Smoke test fixtures
```

### 2. Test Data Factories

Centralized in `tests/factories/`:

```typescript
// tests/factories/userFactory.ts
export const createUser = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  ...overrides,
});

// tests/factories/botFactory.ts
export const createBot = (overrides = {}) => ({
  id: 'bot-test-id',
  name: 'Test Bot',
  provider: 'openai',
  status: 'active',
  ...overrides,
});
```

### 3. Mock Factories

```typescript
// tests/mocks/apiMock.ts
export const mockApi = (response, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(response),
  text: () => Promise.resolve(JSON.stringify(response)),
});

// tests/mocks/dbMock.ts
export const mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
};
```

### 4. Assertion Helpers

```typescript
// tests/helpers/assertions.ts
export class TestAssertions {
  static assertValidJsonResponse(res, expectedKeys = []) {
    expect(res.status).toBe(200);
    const data = res.body;
    expect(typeof data).toBe('object');
    if (expectedKeys.length) {
      for (const key of expectedKeys) {
        expect(key in data).toBe(true, `Missing key: ${key}`);
      }
    }
    return data;
  }

  static assertBotResponse(res) {
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    expect(typeof res.body.response).toBe('string');
  }
}
```

### 5. Parameterized Test Patterns

```typescript
// tests/unit/commandExecutor.test.ts
const COMMAND_TEST_CASES = [
  ['open_browser', { type: 'url', url: 'https://google.com' }, true],
  ['play_music', { type: 'shell', command: 'player play' }, true],
  ['invalid', null, false],
];

describe.each(COMMAND_TEST_CASES)('CommandExecutor with command %s', (command, config, expected) => {
  it(`should return ${expected}`, () => {
    // Arrange
    const executor = new CommandExecutor();
    if (config) {
      executor.config.commands[command] = config;
    }

    // Act
    const result = executor.execute(command);

    // Assert
    expect(result).toBe(expected);
  });
});
```

## Highest Quality End State

### Vision: "Tests as Living Documentation"

#### 1. Test Organization
```
tests/
├── unit/                      # Pure unit tests
│   ├── test_user_service.ts
│   ├── test_config_validation.ts
│   └── test_error_handling.ts
├── integration/               # Service integration
│   ├── test_bot_api.ts
│   ├── test_memory_providers.ts
│   └── test_web_api.ts
├── e2e/                       # End-to-end
│   ├── test_voice_workflow.ts
│   └── test_web_workflow.ts
├── smoke/                     # Critical path
│   └── test_system_health.ts
├── fixtures/                  # Shared test data
│   ├── users.ts
│   ├── bots.ts
│   └── configs.ts
├── helpers/                   # Test utilities
│   ├── assertions.ts
│   ├── mocks.ts
│   └── factories.ts
├── mocks/                     # Shared mock implementations
│   ├── apiMock.ts
│   └── dbMock.ts
└── conftest.ts               # Root fixtures
```

#### 2. Test Quality Standards

**Every test must have:**
1. Clear docstring explaining what's being tested
2. AAA structure (Arrange, Act, Assert)
3. Single responsibility (one concept per test)
4. Meaningful assertions (not just `expect(true).toBe(true)`)
5. Fast execution (< 100ms for unit tests)

**Example:**
```typescript
/**
 * Test that UserService validates email format correctly
 * to prevent invalid user data from entering the system.
 */
describe('UserService', () => {
  it('should return true for valid email format', () => {
    // Arrange
    const service = new UserService();

    // Act
    const result = service.validateEmail('test@example.com');

    // Assert
    expect(result).toBe(true);
  });
});
```

#### 3. Test Maintenance Strategy

**Automated Quality Gates:**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - name: Unit Tests
        run: npm run test:unit
      - name: Integration Tests
        run: npm run test:integration
      - name: Smoke Tests
        run: npm run test:smoke
      - name: E2E Tests (nightly)
        if: github.event_name == 'schedule'
        run: npm run test:e2e
```

**Coverage Targets:**
- Unit tests: 80% line coverage minimum
- Integration tests: Cover all API endpoints
- E2E tests: Cover all critical user journeys

### 4. Reusable Test Components

#### Context Managers for Complex Setup
```typescript
// tests/helpers/setup.ts
export class TestSetup {
  static async withTempDatabase(callback: (db: any) => Promise<any>) {
    const db = await createTestDatabase();
    try {
      return await callback(db);
    } finally {
      await db.close();
    }
  }
}
```

#### Decorators for Common Patterns
```typescript
// tests/helpers/decorators.ts
export function withMockLLM(response = 'test response') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const llmMock = { generate: jest.fn().mockResolvedValue(response) };
      // Inject mock into the method context
      return originalMethod.apply(this, [llmMock, ...args.slice(1)]);
    };
    return descriptor;
  };
}
```

### 5. Test Naming Convention

```typescript
// Pattern: test_[unit]_[condition]_[expected_result]

describe('CommandExecutor', () => {
  it('should return true when given valid command', () => {});
  it('should return false when given invalid command', () => {});
  it('should throw error when dependencies missing', () => {});
});
```

### 6. Performance Test Strategy

```typescript
// tests/perf/test_performance.ts
describe('Performance Tests', () => {
  it('should process audio chunk in real-time', () => {
    const pipeline = new VoicePipeline();
    const audioChunk = generateTestAudio(100); // 100ms chunk

    const start = performance.now();
    const result = pipeline.processChunk(audioChunk);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100); // Must process faster than real-time
    expect(result).toBeDefined();
  });
});
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `tests/factories/` module
- [ ] Create `tests/helpers/` module
- [ ] Create `tests/mocks/` module
- [ ] Refactor `tests/conftest.ts` to use imports from factories/helpers
- [ ] Document all existing fixtures

### Phase 2: DRY Refactoring (Week 2)
- [ ] Extract repeated mock setups to MockFactory
- [ ] Create TestDataFactory for common data patterns
- [ ] Refactor similar test classes to use shared base classes
- [ ] Create parameterized test datasets
- [ ] Add smoke test suite

### Phase 3: Quality Gates (Week 3)
- [ ] Add test coverage thresholds to CI (unit ≥ 80%)
- [ ] Add test timing checks (fail if unit test > 100ms)
- [ ] Create test reliability scorecard
- [ ] Document test maintenance guidelines

## Test Review Checklist

Before merging any test:
- [ ] Test has clear, descriptive docstring
- [ ] Test follows AAA structure
- [ ] Test uses appropriate fixtures (not manual setup)
- [ ] Test assertions are meaningful
- [ ] Test runs in < 100ms (unit) or < 10s (integration)
- [ ] Test cleans up after itself
- [ ] Test doesn't duplicate existing test logic
- [ ] Test uses shared helpers where applicable