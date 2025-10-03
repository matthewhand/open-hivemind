# WebUI Test Suite

This directory contains the test suite for the WebUI client application. The tests are organized by component type and include unit tests for components, hooks, and context providers.

## Test Structure

```
tests/
├── components/          # Component tests
│   └── daisyui/         # DaisyUI component tests
├── contexts/            # Context provider tests
├── hooks/               # Custom hook tests
├── utils/               # Test utilities and helpers
│   ├── testUtils.tsx    # Common test utilities
│   ├── mockData.ts      # Mock data for tests
│   └── setupTests.ts    # Test setup file
└── README.md            # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="ComponentName"
```

## Test Utilities

### testUtils.tsx

This file contains common test utilities and helper functions:

- `customRender`: Wrapper around React Testing Library's render with providers
- `createMockFunction`: Helper to create typed mock functions
- `waitForAsync`: Helper to wait for async operations
- `createMockEvent`: Helper to create mock DOM events
- `mockFetchResponse`: Helper to mock successful fetch responses
- `mockFetchError`: Helper to mock failed fetch responses
- `createMockUser`: Helper to create mock user objects
- `createMockTokens`: Helper to create mock auth tokens
- `createMockFile`: Helper to create mock File objects
- `createMockLocalStorage`: Helper to mock localStorage
- `createMockSessionStorage`: Helper to mock sessionStorage
- `createMockIntersectionObserver`: Helper to mock IntersectionObserver
- `createMockResizeObserver`: Helper to mock ResizeObserver
- `createMockMutationObserver`: Helper to mock MutationObserver
- `createMockURL`: Helper to mock URL.createObjectURL and revokeObjectURL
- `createMockMatchMedia`: Helper to mock window.matchMedia
- `createMockScrollTo`: Helper to mock window.scrollTo
- `createMockAlert`: Helper to mock window.alert
- `createMockConfirm`: Helper to mock window.confirm
- `createMockPrompt`: Helper to mock window.prompt
- `setupCommonMocks`: Helper to setup common browser API mocks
- `cleanupCommonMocks`: Helper to cleanup mocks

### mockData.ts

This file contains mock data used across tests:

- `mockUsers`: Array of mock user objects
- `mockAgents`: Array of mock agent objects
- `mockPersonas`: Array of mock persona objects
- `mockProviders`: Object containing mock provider data
- `mockMetrics`: Mock metrics object
- `mockMessageFlowEvents`: Array of mock message flow events
- `mockAlertEvents`: Array of mock alert events
- `mockPerformanceMetrics`: Array of mock performance metrics
- `mockBotStats`: Array of mock bot stats
- `mockSitemapData`: Mock sitemap data
- `mockAuthTokens`: Mock auth tokens
- `mockFiles`: Array of mock file objects
- `mockFormData`: Object containing mock form data
- `mockApiResponses`: Object containing mock API responses

### setupTests.ts

This file sets up common test configurations:

- Imports Jest DOM matchers
- Sets up common browser API mocks
- Mocks environment variables
- Filters out expected console warnings and errors

## Writing Tests

### Component Tests

Component tests should be placed in the `components/` directory and follow the naming convention `ComponentName.test.tsx`.

Example:
```tsx
import { render, screen } from '@/test-utils';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### Hook Tests

Hook tests should be placed in the `hooks/` directory and follow the naming convention `useHookName.test.ts`.

Example:
```tsx
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.value).toBe('initial');
  });
});
```

### Context Tests

Context tests should be placed in the `contexts/` directory and follow the naming convention `ContextName.test.tsx`.

Example:
```tsx
import { render, screen } from '@/test-utils';
import { MyProvider, useMyContext } from '@/contexts/MyContext';

const TestComponent = () => {
  const { value } = useMyContext();
  return <div>{value}</div>;
};

describe('MyContext', () => {
  it('should provide context value', () => {
    render(
      <MyProvider value="test">
        <TestComponent />
      </MyProvider>
    );
    
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Use the custom render function**: Always use the `render` function from `@/test-utils` to ensure components are wrapped with necessary providers.

2. **Mock external dependencies**: Use the provided mock utilities to mock browser APIs and external dependencies.

3. **Use mock data**: Use the mock data from `mockData.ts` to ensure consistency across tests.

4. **Test user interactions**: Use `fireEvent` or `userEvent` from Testing Library to test user interactions.

5. **Test async behavior**: Use `waitFor` or `act` to test async behavior and state updates.

6. **Clean up after tests**: Use `afterEach` to clean up any side effects created during tests.

7. **Write descriptive test names**: Use descriptive test names that clearly explain what is being tested.

8. **Test edge cases**: Don't forget to test edge cases and error conditions.

9. **Keep tests focused**: Each test should focus on a single behavior or feature.

10. **Use proper assertions**: Use the appropriate matchers from Jest and Jest DOM to make assertions clear and meaningful.

## Debugging Tests

### Debugging with screen.debug()

You can use `screen.debug()` to print the current DOM state:

```tsx
import { render, screen } from '@/test-utils';
import MyComponent from '@/components/MyComponent';

test('debug example', () => {
  render(<MyComponent />);
  screen.debug();
});
```

### Debugging with logRoles

You can use `logRoles` to see all available roles in the DOM:

```tsx
import { render, logRoles } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

test('logRoles example', () => {
  const { container } = render(<MyComponent />);
  logRoles(container);
});
```

### Running tests in debug mode

You can run tests in debug mode to use browser dev tools:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open Chrome and go to `chrome://inspect` to debug.