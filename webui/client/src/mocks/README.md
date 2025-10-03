# WebUI API Integration Testing Infrastructure

This directory contains the comprehensive testing infrastructure for WebUI API integration, including Mock Service Worker (MSW) setup, WebSocket testing utilities, error boundary testing, and integration test suites.

## Overview

The API integration testing infrastructure provides:

1. **Mock Service Worker (MSW)** - Complete API mocking for HTTP requests
2. **WebSocket Testing Infrastructure** - Mock WebSocket connections for real-time features
3. **Error Boundary Testing** - Comprehensive error handling and recovery testing
4. **Integration Test Suites** - End-to-end testing of WebUI components with API dependencies
5. **Test Utilities** - Helper functions and utilities for streamlined testing

## Directory Structure

```
mocks/
├── README.md                 # This documentation
├── browser.ts               # MSW browser setup
├── server.ts                # MSW server setup
├── handlers.ts              # API mock handlers
├── websocketMock.ts         # WebSocket mock implementation
├── websocketUtils.ts        # WebSocket testing utilities
└── errorBoundaryUtils.ts    # Error boundary testing utilities

tests/
├── integration/
│   ├── apiIntegration.test.tsx      # API integration tests
│   ├── websocketIntegration.test.tsx # WebSocket integration tests
│   └── errorBoundaryIntegration.test.tsx # Error boundary integration tests
└── utils/
    └── apiTestUtils.ts              # Comprehensive test utilities
```

## Setup and Configuration

### 1. Mock Service Worker (MSW)

MSW is configured for both browser and node environments:

- **Browser Setup** (`browser.ts`): For development and browser testing
- **Server Setup** (`server.ts`): For Node.js testing environment
- **API Handlers** (`handlers.ts`): Comprehensive mock handlers for all API endpoints

### 2. Service Worker

The service worker file (`public/mockServiceWorker.js`) is automatically generated and should be served from the public directory.

### 3. Jest Configuration

The test setup is configured in `webui/jest.setup.ts` with:
- MSW server initialization
- WebSocket mocking setup
- Custom matchers for testing
- Global mocks for browser APIs

## Usage

### Basic API Mocking

```typescript
import { render, screen } from '@testing-library/react';
import { server } from '../mocks/server';
import { rest } from 'msw';
import Dashboard from '../components/Dashboard';

test('should fetch and display dashboard data', async () => {
  render(<Dashboard />);
  
  // Wait for data to be loaded
  await waitFor(() => {
    expect(screen.getByText('test-bot-1')).toBeInTheDocument();
  });
});
```

### Custom API Mocking

```typescript
// Override default handlers for specific test
test('should handle API errors', async () => {
  server.use(
    rest.get('/webui/api/config', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ message: 'Server Error' }));
    })
  );

  render(<Dashboard />);
  
  await waitFor(() => {
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });
});
```

### WebSocket Testing

```typescript
import { createWebSocketTestUtils, mockMessageGenerators } from '../mocks/websocketUtils';

test('should handle real-time updates', async () => {
  const wsUtils = createWebSocketTestUtils();
  await wsUtils.connect();

  render(<ApiStatusMonitor />);
  
  // Simulate real-time update
  const update = mockMessageGenerators.apiStatusUpdate('test-endpoint', 'online');
  wsUtils.simulateMessage(update);

  await waitFor(() => {
    expect(screen.getByText('test-endpoint')).toBeInTheDocument();
  });
});
```

### Error Boundary Testing

```typescript
import { createErrorBoundaryTestUtils, TestableErrorBoundary, ErrorThrower } from '../mocks/errorBoundaryUtils';

test('should catch and display errors', async () => {
  const boundaryRef = React.createRef();
  
  render(
    <TestableErrorBoundary ref={boundaryRef}>
      <ErrorThrower errorType="networkFailure" />
    </TestableErrorBoundary>
  );

  const errorUtils = createErrorBoundaryTestUtils(boundaryRef.current);
  await waitFor(() => {
    expect(errorUtils.hasError()).toBe(true);
  });
});
```

### Comprehensive Integration Testing

```typescript
import { createIntegrationTestUtils, testScenarios, mockData } from '../tests/utils/apiTestUtils';

test('should handle full integration scenario', async () => {
  const testUtils = await testScenarios.fullIntegration(
    '/webui/api/config',
    mockData.config(),
    boundaryRef,
    () => renderWithProviders(<Dashboard />)
  );

  // Test API interaction
  await testUtils.waitForWebSocketEvent('message');
  
  // Test WebSocket functionality
  testUtils.simulateWebSocketMessage(mockData.activity());
  
  // Test error handling
  testUtils.simulateError('networkFailure');
  await testUtils.waitForError();
  
  // Test recovery
  testUtils.retryFromError();
  await testUtils.waitForRecovery();
});
```

## API Endpoints Covered

### Configuration API
- `GET /webui/api/config` - Get configuration
- `POST /webui/api/config/reload` - Reload configuration
- `GET /webui/api/config/sources` - Get config sources
- `POST /webui/api/config/hot-reload` - Hot reload configuration
- `GET /webui/api/config/export` - Export configuration

### Bot Management API
- `GET /webui/api/bots` - Get all bots
- `POST /webui/api/bots` - Create new bot
- `PUT /webui/api/bots/:id` - Update bot
- `DELETE /webui/api/bots/:id` - Delete bot
- `POST /webui/api/bots/:id/clone` - Clone bot

### Status and Activity API
- `GET /dashboard/api/status` - Get system status
- `GET /dashboard/api/activity` - Get activity data

### API Monitoring
- `GET /health/api-endpoints` - Get API endpoint status
- `POST /health/api-endpoints` - Add API endpoint
- `PUT /health/api-endpoints/:id` - Update API endpoint
- `DELETE /health/api-endpoints/:id` - Remove API endpoint
- `POST /health/api-endpoints/start` - Start monitoring
- `POST /health/api-endpoints/stop` - Stop monitoring

### Authentication API
- `POST /api/auth/admin/login` - Admin login
- `POST /webui/api/auth/login` - WebUI login
- `POST /webui/api/auth/refresh` - Refresh token
- `POST /webui/api/auth/verify` - Verify token

### Admin API
- `GET /api/admin/personas` - Get personas
- `POST /api/admin/personas` - Create persona
- `PUT /api/admin/personas/:key` - Update persona
- `DELETE /api/admin/personas/:key` - Delete persona
- `GET /api/admin/agents` - Get agents
- `POST /api/admin/agents` - Create agent
- `PUT /api/admin/agents/:id` - Update agent
- `DELETE /api/admin/agents/:id` - Delete agent

## Error Scenarios Covered

### Network Errors
- Connection timeouts
- Network failures
- DNS resolution failures
- CORS errors

### HTTP Errors
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 429 Too Many Requests
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

### Application Errors
- Parsing errors
- Validation errors
- Authentication errors
- Authorization errors
- Rate limiting errors
- Service degradation

## WebSocket Events Supported

### Real-time Updates
- Agent status changes
- System metrics updates
- Activity notifications
- API status changes
- Error notifications

### Connection Management
- Connection establishment
- Connection loss
- Reconnection attempts
- Connection errors
- Message queuing during disconnection

## Performance Testing

### High-Frequency Updates
- Handles 100+ messages per second
- Maintains UI responsiveness
- Efficient message processing

### Large Payloads
- Handles large message payloads
- Memory-efficient processing
- Graceful degradation

### Connection Stress Testing
- Rapid connection/disconnection
- Multiple concurrent connections
- Network instability simulation

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mock Management
- Reset mocks between tests
- Use specific mocks for each test scenario
- Avoid over-mocking

### 3. Async Testing
- Use proper async/await patterns
- Wait for UI updates, not just promises
- Handle timeout scenarios

### 4. Error Testing
- Test both error and recovery scenarios
- Verify error messages are user-friendly
- Test retry mechanisms

### 5. Cleanup
- Clean up resources after tests
- Reset WebSocket connections
- Clear event listeners

## Debugging

### 1. Enable Verbose Logging
```typescript
// In test setup
server.listen({
  onUnhandledRequest: 'warn'
});
```

### 2. Inspect WebSocket Events
```typescript
// Log all WebSocket events
wsUtils.on('message', (data) => {
  console.log('WebSocket message:', data);
});
```

### 3. Debug Error Boundaries
```typescript
// Add error handler to boundary
<TestableErrorBoundary onError={(error, errorInfo) => {
  console.error('Error caught:', error, errorInfo);
}}>
```

### 4. Check Network Requests
```typescript
// Monitor MSW requests
server.events.on('request:start', ({ request }) => {
  console.log('Request started:', request.method, request.url);
});
```

## Troubleshooting

### Common Issues

1. **MSW not intercepting requests**
   - Ensure service worker is properly registered
   - Check that requests match the mocked patterns
   - Verify MSW is started before tests run

2. **WebSocket connection issues**
   - Ensure WebSocket mock is properly set up
   - Check connection state before sending messages
   - Verify message format is correct

3. **Error boundary not catching errors**
   - Ensure errors are thrown within component tree
   - Check that error boundary is properly positioned
   - Verify error boundary is not disabled

4. **Test timeouts**
   - Increase timeout for slow operations
   - Check for proper async handling
   - Ensure cleanup is working correctly

### Solutions

1. **Reset test state**
   ```typescript
   beforeEach(() => {
     server.resetHandlers();
     TestableErrorBoundary.clearInstances();
   });
   ```

2. **Handle async operations**
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('expected text')).toBeInTheDocument();
   }, { timeout: 10000 });
   ```

3. **Debug mock responses**
   ```typescript
   server.use(
     rest.get('/api/test', (req, res, ctx) => {
       console.log('Mock handler called');
       return res(ctx.json({ data: 'test' }));
     })
   );
   ```

## Contributing

When adding new tests or mock handlers:

1. Follow the existing code structure and patterns
2. Add comprehensive error scenario coverage
3. Include performance considerations
4. Update documentation for new APIs
5. Add test utilities for common scenarios

## Resources

- [MSW Documentation](https://mswjs.io/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)