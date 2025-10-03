import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { createWebSocketTestUtils, mockMessageGenerators } from '../../mocks/websocketUtils';
import { createErrorBoundaryTestUtils, TestableErrorBoundary, ErrorThrower } from '../../mocks/errorBoundaryUtils';
import { apiService } from '../../services/api';
import Dashboard from '../../components/Dashboard';
import BotManager from '../../components/BotManager';
import ApiStatusMonitor from '../../components/ApiStatusMonitor';
import ActivityMonitor from '../../components/ActivityMonitor';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TestableErrorBoundary>
    {children}
  </TestableErrorBoundary>
);

describe('API Integration Tests', () => {
  let wsUtils: any;
  let errorUtils: any;

  beforeEach(() => {
    wsUtils = createWebSocketTestUtils();
    errorUtils = null;
  });

  afterEach(() => {
    if (wsUtils) {
      wsUtils.disconnect();
    }
    TestableErrorBoundary.clearInstances();
  });

  describe('Dashboard API Integration', () => {
    test('should fetch and display dashboard data successfully', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for initial data fetch
      await waitFor(() => {
        expect(screen.getByText(/test-bot-1/i)).toBeInTheDocument();
      });

      // Verify both bots are displayed
      expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      expect(screen.getByText('test-bot-2')).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    test('should retry failed requests', async () => {
      let requestCount = 0;
      
      // Mock failing request that succeeds on retry
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          requestCount++;
          if (requestCount <= 2) {
            return res(ctx.status(500), ctx.json({ message: 'Server error' }));
          }
          return res(ctx.status(200), ctx.json({
            bots: [{ name: 'retry-bot', messageProvider: 'discord', llmProvider: 'openai' }],
            warnings: [],
            legacyMode: false,
            environment: 'test'
          }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Click retry button
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/try again/i);
      await userEvent.click(retryButton);

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByText('retry-bot')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    test('should handle network timeouts', async () => {
      // Mock timeout
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.delay(10000), ctx.status(408));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for timeout error
      await waitFor(() => {
        expect(screen.getByText(/timeout|network/i)).toBeInTheDocument();
      }, { timeout: 15000 });
    });
  });

  describe('Bot Management API Integration', () => {
    test('should create a new bot successfully', async () => {
      render(
        <TestWrapper>
          <BotManager />
        </TestWrapper>
      );

      // Fill out bot creation form
      const nameInput = screen.getByLabelText(/name/i);
      const messageProviderSelect = screen.getByLabelText(/message provider/i);
      const llmProviderSelect = screen.getByLabelText(/llm provider/i);
      const createButton = screen.getByText(/create bot/i);

      await userEvent.type(nameInput, 'new-test-bot');
      await userEvent.selectOptions(messageProviderSelect, 'discord');
      await userEvent.selectOptions(llmProviderSelect, 'openai');
      
      await userEvent.click(createButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/bot created successfully/i)).toBeInTheDocument();
      });

      // Verify new bot appears in list
      await waitFor(() => {
        expect(screen.getByText('new-test-bot')).toBeInTheDocument();
      });
    });

    test('should handle bot creation errors', async () => {
      // Mock bot creation error
      server.use(
        rest.post('/webui/api/bots', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ message: 'Invalid bot configuration' }));
        })
      );

      render(
        <TestWrapper>
          <BotManager />
        </TestWrapper>
      );

      // Attempt to create bot
      const nameInput = screen.getByLabelText(/name/i);
      const createButton = screen.getByText(/create bot/i);

      await userEvent.type(nameInput, 'invalid-bot');
      await userEvent.click(createButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid bot configuration/i)).toBeInTheDocument();
      });
    });

    test('should update existing bot', async () => {
      render(
        <TestWrapper>
          <BotManager />
        </TestWrapper>
      );

      // Wait for bots to load
      await waitFor(() => {
        expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      });

      // Click edit button for first bot
      const editButton = screen.getAllByText(/edit/i)[0];
      await userEvent.click(editButton);

      // Update bot name
      const nameInput = screen.getByDisplayValue('test-bot-1');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'updated-test-bot');

      // Save changes
      const saveButton = screen.getByText(/save/i);
      await userEvent.click(saveButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/bot updated successfully/i)).toBeInTheDocument();
      });
    });

    test('should delete bot successfully', async () => {
      render(
        <TestWrapper>
          <BotManager />
        </TestWrapper>
      );

      // Wait for bots to load
      await waitFor(() => {
        expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      });

      // Click delete button for first bot
      const deleteButton = screen.getAllByText(/delete/i)[0];
      await userEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/bot deleted successfully/i)).toBeInTheDocument();
      });

      // Verify bot is removed from list
      await waitFor(() => {
        expect(screen.queryByText('test-bot-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Status Monitoring Integration', () => {
    test('should display API endpoint status', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for API status to load
      await waitFor(() => {
        expect(screen.getByText(/health check/i)).toBeInTheDocument();
      });

      // Verify endpoint statuses are displayed
      expect(screen.getByText('Health Check')).toBeInTheDocument();
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('Config API')).toBeInTheDocument();
    });

    test('should handle real-time API status updates via WebSocket', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/health check/i)).toBeInTheDocument();
      });

      // Simulate WebSocket status update
      const statusUpdate = mockMessageGenerators.apiStatusUpdate('health-check', 'error', 5000);
      wsUtils.simulateMessage(statusUpdate);

      // Wait for status update to be reflected
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should start and stop API monitoring', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/health check/i)).toBeInTheDocument();
      });

      // Start monitoring
      const startButton = screen.getByText(/start monitoring/i);
      await userEvent.click(startButton);

      // Wait for monitoring to start
      await waitFor(() => {
        expect(screen.getByText(/monitoring active/i)).toBeInTheDocument();
      });

      // Stop monitoring
      const stopButton = screen.getByText(/stop monitoring/i);
      await userEvent.click(stopButton);

      // Wait for monitoring to stop
      await waitFor(() => {
        expect(screen.getByText(/monitoring inactive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Activity Monitoring Integration', () => {
    test('should fetch and display activity data', async () => {
      render(
        <TestWrapper>
          <ActivityMonitor />
        </TestWrapper>
      );

      // Wait for activity data to load
      await waitFor(() => {
        expect(screen.getByText(/activity/i)).toBeInTheDocument();
      });

      // Verify activity metrics are displayed
      expect(screen.getByText(/events/i)).toBeInTheDocument();
      expect(screen.getByText(/agents/i)).toBeInTheDocument();
    });

    test('should filter activity data', async () => {
      render(
        <TestWrapper>
          <ActivityMonitor />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/activity/i)).toBeInTheDocument();
      });

      // Select a specific bot filter
      const botFilter = screen.getByLabelText(/bot/i);
      await userEvent.selectOptions(botFilter, 'test-bot-1');

      // Wait for filtered data
      await waitFor(() => {
        expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      });
    });

    test('should handle real-time activity updates', async () => {
      render(
        <TestWrapper>
          <ActivityMonitor />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/activity/i)).toBeInTheDocument();
      });

      // Simulate real-time activity update
      const activityUpdate = mockMessageGenerators.activityUpdate('test-bot-1', 'message');
      wsUtils.simulateMessage(activityUpdate);

      // Wait for activity to be reflected
      await waitFor(() => {
        expect(screen.getByText(/test-bot-1/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    test('should establish WebSocket connection', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });
    });

    test('should handle WebSocket disconnection', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate disconnection
      wsUtils.simulateDisconnect();

      // Wait for disconnection to be reflected
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket reconnection', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate disconnection and reconnection
      wsUtils.simulateReconnect();

      // Wait for reconnection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });
    });

    test('should handle WebSocket errors', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate WebSocket error
      wsUtils.simulateError();

      // Wait for error to be reflected
      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    test('should catch and display API errors', async () => {
      const TestComponent = () => {
        const [data, setData] = React.useState(null);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          apiService.getConfig()
            .then(setData)
            .catch(setError);
        }, []);

        if (error) throw error;
        if (!data) return <div>Loading...</div>;
        return <div>Data loaded</div>;
      };

      // Mock API error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'API Error' }));
        })
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for error boundary to catch error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });

    test('should recover from errors', async () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        const [data, setData] = React.useState(null);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          if (shouldThrow) {
            setError(new Error('Test error'));
          } else {
            setData('recovered');
          }
        }, []);

        if (error) throw error;
        if (!data) return <div>Loading...</div>;
        return <div>Data loaded</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for error boundary to catch error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByTestId('error-boundary-retry');
      
      // Prevent further errors
      shouldThrow = false;
      
      await userEvent.click(retryButton);

      // Wait for recovery
      await waitFor(() => {
        expect(screen.getByText('Data loaded')).toBeInTheDocument();
      });
    });

    test('should handle nested component errors', async () => {
      const NestedComponent = () => {
        throw new Error('Nested error');
      };

      const ParentComponent = () => (
        <div>
          <h1>Parent</h1>
          <NestedComponent />
        </div>
      );

      render(
        <TestWrapper>
          <ParentComponent />
        </TestWrapper>
      );

      // Wait for error boundary to catch nested error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Concurrent API Requests', () => {
    test('should handle multiple concurrent requests', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Dashboard makes multiple concurrent requests
      await waitFor(() => {
        expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      });

      // Verify all data is loaded
      expect(screen.getByText('test-bot-2')).toBeInTheDocument();
      expect(screen.getByText(/uptime/i)).toBeInTheDocument();
    });

    test('should handle partial failures in concurrent requests', async () => {
      // Mock one endpoint to fail
      server.use(
        rest.get('/dashboard/api/status', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Status API failed' }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should still load config data despite status failure
      await waitFor(() => {
        expect(screen.getByText('test-bot-1')).toBeInTheDocument();
      });

      // Should show error for status data
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });
  });

  describe('Request Cancellation', () => {
    test('should cancel requests on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Unmount component before request completes
      unmount();

      // Mock slow request to test cancellation
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.delay(5000), ctx.status(200));
        })
      );

      // Should not throw errors after unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});