import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { createWebSocketTestUtils } from '../../mocks/websocketUtils';
import { createErrorBoundaryTestUtils, TestableErrorBoundary } from '../../mocks/errorBoundaryUtils';
import { apiSlice } from '../../store/slices/apiSlice';
import { authSlice } from '../../store/slices/authSlice';
import { configSlice } from '../../store/slices/configSlice';
import { dashboardSlice } from '../../store/slices/dashboardSlice';
import { errorSlice } from '../../store/slices/errorSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import { websocketSlice } from '../../store/slices/websocketSlice';

// Test store configuration
export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      api: apiSlice.reducer,
      auth: authSlice.reducer,
      config: configSlice.reducer,
      dashboard: dashboardSlice.reducer,
      error: errorSlice.reducer,
      ui: uiSlice.reducer,
      websocket: websocketSlice.reducer,
    },
    preloadedState: {
      api: {
        endpoints: {},
        queries: {},
        mutations: {},
        provided: {},
        subscriptions: {},
        config: {
          reducerPath: 'api',
          keepUnusedDataFor: 60,
          refetchOnMountOrArgChange: false,
          refetchOnFocus: false,
          refetchOnReconnect: true,
        },
      },
      ...initialState,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(apiSlice.middleware),
  });
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  initialState?: any;
  store?: any;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  initialState = {}, 
  store 
}) => {
  const testStore = store || createTestStore(initialState);

  return (
    <Provider store={testStore}>
      <BrowserRouter>
        <TestableErrorBoundary>
          {children}
        </TestableErrorBoundary>
      </BrowserRouter>
    </Provider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialState = {},
    store,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const testStore = store || createTestStore(initialState);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper store={testStore} initialState={initialState}>
      {children}
    </TestWrapper>
  );

  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// API mocking utilities
export class ApiMockUtils {
  private static originalHandlers: any[] = [];

  static setupMockApi(endpoint: string, response: any, status = 200) {
    const handler = rest[endpoint.includes('POST') ? 'post' : 
                   endpoint.includes('PUT') ? 'put' : 
                   endpoint.includes('DELETE') ? 'delete' : 'get'](
      endpoint, (req, res, ctx) => {
        return res(ctx.status(status), ctx.json(response));
      }
    );

    server.use(handler);
    this.originalHandlers.push(handler);
  }

  static setupMockError(endpoint: string, error: string, status = 500) {
    const handler = rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ message: error }));
    });

    server.use(handler);
    this.originalHandlers.push(handler);
  }

  static setupMockNetworkError(endpoint: string) {
    const handler = rest.get(endpoint, (req, res) => {
      return res.networkError('Network connection failed');
    });

    server.use(handler);
    this.originalHandlers.push(handler);
  }

  static setupMockTimeout(endpoint: string, delay = 10000) {
    const handler = rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.delay(delay), ctx.status(408));
    });

    server.use(handler);
    this.originalHandlers.push(handler);
  }

  static resetMocks() {
    server.resetHandlers();
    this.originalHandlers = [];
  }

  static restoreOriginals() {
    server.use(...this.originalHandlers);
  }
}

// WebSocket testing utilities
export class WebSocketTestUtils {
  private wsUtils: any;

  constructor() {
    this.wsUtils = createWebSocketTestUtils();
  }

  connect() {
    return this.wsUtils.connect();
  }

  disconnect() {
    this.wsUtils.disconnect();
  }

  simulateMessage(data: any) {
    this.wsUtils.simulateMessage(data);
  }

  simulateError() {
    this.wsUtils.simulateError();
  }

  simulateDisconnect() {
    this.wsUtils.simulateDisconnect();
  }

  simulateReconnect() {
    this.wsUtils.simulateReconnect();
  }

  waitForEvent(eventType: string, timeout = 5000) {
    return this.wsUtils.waitForEvent(eventType, timeout);
  }

  getEventLog() {
    return this.wsUtils.getEventLog();
  }

  clearEventLog() {
    this.wsUtils.clearEventLog();
  }

  isConnected() {
    return this.wsUtils.isConnected();
  }

  getReadyState() {
    return this.wsUtils.getReadyState();
  }

  getUtils() {
    return this.wsUtils;
  }
}

// Error boundary testing utilities
export class ErrorBoundaryTestUtils {
  private errorUtils: any;
  private boundaryRef: React.RefObject<any>;

  constructor(boundaryRef: React.RefObject<any>) {
    this.boundaryRef = boundaryRef;
    if (boundaryRef.current) {
      this.errorUtils = createErrorBoundaryTestUtils(boundaryRef.current);
    }
  }

  simulateError(errorType: string, errorMessage?: string) {
    if (this.errorUtils) {
      this.errorUtils.simulateError(errorType, errorMessage);
    }
  }

  hasError(): boolean {
    return this.errorUtils ? this.errorUtils.hasError() : false;
  }

  getError(): Error | undefined {
    return this.errorUtils ? this.errorUtils.getError() : undefined;
  }

  getErrorInfo(): any {
    return this.errorUtils ? this.errorUtils.getErrorInfo() : undefined;
  }

  getRetryCount(): number {
    return this.errorUtils ? this.errorUtils.getRetryCount() : 0;
  }

  retry() {
    if (this.errorUtils) {
      this.errorUtils.retry();
    }
  }

  waitForError(timeout = 5000) {
    return this.errorUtils ? this.errorUtils.waitForError(timeout) : Promise.reject(new Error('Error utils not initialized'));
  }

  waitForRecovery(timeout = 5000) {
    return this.errorUtils ? this.errorUtils.waitForRecovery(timeout) : Promise.reject(new Error('Error utils not initialized'));
  }

  reset() {
    if (this.errorUtils) {
      this.errorUtils.reset();
    }
  }

  getUtils() {
    return this.errorUtils;
  }
}

// Comprehensive test utilities
export class IntegrationTestUtils {
  private apiUtils: ApiMockUtils;
  private wsUtils: WebSocketTestUtils;
  private errorUtils: ErrorBoundaryTestUtils | null;
  private store: any;

  constructor(store?: any) {
    this.apiUtils = new ApiMockUtils();
    this.wsUtils = new WebSocketTestUtils();
    this.errorUtils = null;
    this.store = store;
  }

  // API utilities
  mockApiSuccess(endpoint: string, response: any, status = 200) {
    this.apiUtils.setupMockApi(endpoint, response, status);
  }

  mockApiError(endpoint: string, error: string, status = 500) {
    this.apiUtils.setupMockError(endpoint, error, status);
  }

  mockApiNetworkError(endpoint: string) {
    this.apiUtils.setupMockNetworkError(endpoint);
  }

  mockApiTimeout(endpoint: string, delay = 10000) {
    this.apiUtils.setupMockTimeout(endpoint, delay);
  }

  resetApiMocks() {
    this.apiUtils.resetMocks();
  }

  // WebSocket utilities
  async connectWebSocket() {
    return this.wsUtils.connect();
  }

  disconnectWebSocket() {
    this.wsUtils.disconnect();
  }

  simulateWebSocketMessage(data: any) {
    this.wsUtils.simulateMessage(data);
  }

  simulateWebSocketError() {
    this.wsUtils.simulateError();
  }

  simulateWebSocketDisconnect() {
    this.wsUtils.simulateDisconnect();
  }

  simulateWebSocketReconnect() {
    this.wsUtils.simulateReconnect();
  }

  waitForWebSocketEvent(eventType: string, timeout = 5000) {
    return this.wsUtils.waitForEvent(eventType, timeout);
  }

  isWebSocketConnected() {
    return this.wsUtils.isConnected();
  }

  // Error boundary utilities
  setupErrorBoundary(boundaryRef: React.RefObject<any>) {
    this.errorUtils = new ErrorBoundaryTestUtils(boundaryRef);
  }

  simulateError(errorType: string, errorMessage?: string) {
    if (this.errorUtils) {
      this.errorUtils.simulateError(errorType, errorMessage);
    }
  }

  hasError(): boolean {
    return this.errorUtils ? this.errorUtils.hasError() : false;
  }

  getError(): Error | undefined {
    return this.errorUtils ? this.errorUtils.getError() : undefined;
  }

  retryFromError() {
    if (this.errorUtils) {
      this.errorUtils.retry();
    }
  }

  waitForError(timeout = 5000) {
    return this.errorUtils ? this.errorUtils.waitForError(timeout) : Promise.reject(new Error('Error boundary not set up'));
  }

  waitForRecovery(timeout = 5000) {
    return this.errorUtils ? this.errorUtils.waitForRecovery(timeout) : Promise.reject(new Error('Error boundary not set up'));
  }

  // Store utilities
  getStoreState() {
    return this.store ? this.store.getState() : null;
  }

  dispatch(action: any) {
    if (this.store) {
      this.store.dispatch(action);
    }
  }

  // Cleanup
  cleanup() {
    this.apiUtils.resetMocks();
    this.wsUtils.disconnect();
    this.errorUtils = null;
    TestableErrorBoundary.clearInstances();
  }
}

// Factory function to create integration test utils
export const createIntegrationTestUtils = (store?: any) => {
  return new IntegrationTestUtils(store);
};

// Common test scenarios
export const testScenarios = {
  // API success scenario
  apiSuccess: async (endpoint: string, response: any, renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    testUtils.mockApiSuccess(endpoint, response);

    const { store } = renderFn();
    testUtils['store'] = store;

    return testUtils;
  },

  // API error scenario
  apiError: async (endpoint: string, error: string, renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    testUtils.mockApiError(endpoint, error);

    const { store } = renderFn();
    testUtils['store'] = store;

    return testUtils;
  },

  // Network error scenario
  networkError: async (endpoint: string, renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    testUtils.mockApiNetworkError(endpoint);

    const { store } = renderFn();
    testUtils['store'] = store;

    return testUtils;
  },

  // WebSocket connection scenario
  webSocketConnection: async (renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    const { store } = renderFn();
    testUtils['store'] = store;

    await testUtils.connectWebSocket();
    return testUtils;
  },

  // Error boundary scenario
  errorBoundary: async (boundaryRef: React.RefObject<any>, renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    const { store } = renderFn();
    testUtils['store'] = store;
    testUtils.setupErrorBoundary(boundaryRef);

    return testUtils;
  },

  // Full integration scenario
  fullIntegration: async (endpoint: string, response: any, boundaryRef: React.RefObject<any>, renderFn: any) => {
    const testUtils = createIntegrationTestUtils();
    testUtils.mockApiSuccess(endpoint, response);

    const { store } = renderFn();
    testUtils['store'] = store;
    testUtils.setupErrorBoundary(boundaryRef);

    await testUtils.connectWebSocket();
    return testUtils;
  }
};

// Mock data generators
export const mockData = {
  // Bot data
  bot: (overrides = {}) => ({
    name: 'test-bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'default',
    systemInstruction: 'You are a helpful assistant',
    mcpServers: [],
    mcpGuard: { enabled: false, type: 'owner' },
    ...overrides
  }),

  // Bot list
  botList: (count = 2) => {
    return Array.from({ length: count }, (_, i) => mockData.bot({
      name: `test-bot-${i + 1}`,
      messageProvider: i % 2 === 0 ? 'discord' : 'slack'
    }));
  },

  // Status data
  status: (overrides = {}) => ({
    bots: mockData.botList().map(bot => ({
      name: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      status: 'online',
      connected: true,
      messageCount: 100,
      errorCount: 0
    })),
    uptime: 3600,
    ...overrides
  }),

  // Activity data
  activity: (overrides = {}) => ({
    events: [
      {
        id: 'event-1',
        timestamp: new Date().toISOString(),
        botName: 'test-bot-1',
        provider: 'discord',
        llmProvider: 'openai',
        channelId: 'channel-1',
        userId: 'user-1',
        messageType: 'incoming',
        contentLength: 50,
        processingTime: 120,
        status: 'success'
      }
    ],
    filters: {
      agents: ['test-bot-1'],
      messageProviders: ['discord'],
      llmProviders: ['openai']
    },
    timeline: [
      {
        timestamp: new Date().toISOString(),
        messageProviders: { discord: 10 },
        llmProviders: { openai: 10 }
      }
    ],
    agentMetrics: [
      {
        botName: 'test-bot-1',
        messageProvider: 'discord',
        llmProvider: 'openai',
        events: 10,
        errors: 0,
        lastActivity: new Date().toISOString(),
        totalMessages: 10,
        recentErrors: []
      }
    ],
    ...overrides
  }),

  // Config data
  config: (overrides = {}) => ({
    bots: mockData.botList(),
    warnings: [],
    legacyMode: false,
    environment: 'test',
    ...overrides
  }),

  // API status data
  apiStatus: (overrides = {}) => ({
    overall: {
      status: 'healthy',
      message: 'All endpoints are responding normally',
      stats: {
        total: 5,
        online: 4,
        slow: 1,
        offline: 0,
        error: 0
      }
    },
    endpoints: [
      {
        id: 'health-check',
        name: 'Health Check',
        url: '/health',
        status: 'online',
        responseTime: 50,
        lastChecked: new Date().toISOString(),
        lastSuccessfulCheck: new Date().toISOString(),
        consecutiveFailures: 0,
        totalChecks: 100,
        successfulChecks: 98,
        averageResponseTime: 45,
        statusCode: 200
      }
    ],
    timestamp: new Date().toISOString(),
    ...overrides
  })
};

// Test helpers
export const testHelpers = {
  // Wait for API call
  waitForApiCall: (endpoint: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkApiCall = () => {
        // In a real implementation, this would check if the API call was made
        // For now, we'll just resolve after a short delay
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for API call to ${endpoint}`));
        } else {
          setTimeout(checkApiCall, 100);
        }
      };
      checkApiCall();
    });
  },

  // Wait for WebSocket message
  waitForWebSocketMessage: (wsUtils: any, messageType: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkMessage = () => {
        const events = wsUtils.getEventLog();
        const messageEvent = events.find((event: any) => 
          event.type === 'message' && 
          event.data.type === messageType
        );
        
        if (messageEvent) {
          resolve(messageEvent);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for WebSocket message type ${messageType}`));
        } else {
          setTimeout(checkMessage, 100);
        }
      };
      checkMessage();
    });
  },

  // Simulate user interaction
  simulateUserInteraction: async (element: HTMLElement, interaction: 'click' | 'type' | 'select', value?: string) => {
    switch (interaction) {
      case 'click':
        element.click();
        break;
      case 'type':
        if (value && element instanceof HTMLInputElement) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'select':
        if (value && element instanceof HTMLSelectElement) {
          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
    }
  },

  // Check if element is in DOM
  isElementInDOM: (element: HTMLElement | null) => {
    return element && document.contains(element);
  },

  // Get element by test id
  getElementByTestId: (testId: string) => {
    return document.querySelector(`[data-testid="${testId}"]`);
  },

  // Wait for element to appear
  waitForElement: (testId: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkElement = () => {
        const element = testHelpers.getElementByTestId(testId);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for element with test id ${testId}`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      checkElement();
    });
  }
};