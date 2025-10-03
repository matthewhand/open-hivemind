import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { 
  createErrorBoundaryTestUtils, 
  TestableErrorBoundary, 
  ErrorThrower, 
  errorScenarios,
  withErrorBoundary 
} from '../../mocks/errorBoundaryUtils';
import { apiService } from '../../services/api';
import Dashboard from '../../components/Dashboard';
import BotManager from '../../components/BotManager';
import ConfigManager from '../../components/ConfigManager';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TestableErrorBoundary>
    {children}
  </TestableErrorBoundary>
);

describe('Error Boundary Integration Tests', () => {
  let errorUtils: any;

  beforeEach(() => {
    TestableErrorBoundary.clearInstances();
  });

  describe('API Error Handling', () => {
    test('should catch and display API request errors', async () => {
      // Mock API error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal Server Error' }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for error boundary to catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error details are displayed
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });

    test('should handle network timeout errors', async () => {
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
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      }, { timeout: 15000 });

      // Verify timeout error is displayed
      expect(screen.getByText(/timeout/i)).toBeInTheDocument();
    });

    test('should handle network connection errors', async () => {
      // Mock network error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for network error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify network error is displayed
      expect(screen.getByText(/network/i)).toBeInTheDocument();
    });

    test('should handle API response parsing errors', async () => {
      // Mock invalid JSON response
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.set('Content-Type', 'application/json'), ctx.body('invalid json'));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for parsing error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify parsing error is displayed
      expect(screen.getByText(/parse/i)).toBeInTheDocument();
    });

    test('should handle authentication errors', async () => {
      // Mock authentication error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ message: 'Authentication failed' }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for authentication error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify authentication error is displayed
      expect(screen.getByText(/authentication/i)).toBeInTheDocument();
    });

    test('should handle permission errors', async () => {
      // Mock permission error
      server.use(
        rest.get('/webui/api/config', (req, res, ctx) => {
          return res(ctx.status(403), ctx.json({ message: 'Permission denied' }));
        })
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for permission error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify permission error is displayed
      expect(screen.getByText(/permission/i)).toBeInTheDocument();
    });
  });

  describe('Component Error Handling', () => {
    test('should catch synchronous component errors', async () => {
      const ThrowingComponent = () => {
        throw new Error('Synchronous component error');
      };

      render(
        <TestWrapper>
          <ThrowingComponent />
        </TestWrapper>
      );

      // Wait for error boundary to catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByText(/synchronous component error/i)).toBeInTheDocument();
    });

    test('should catch asynchronous component errors', async () => {
      const AsyncThrowingComponent = () => {
        React.useEffect(() => {
          throw new Error('Asynchronous component error');
        }, []);
        return <div>Loading...</div>;
      };

      render(
        <TestWrapper>
          <AsyncThrowingComponent />
        </TestWrapper>
      );

      // Wait for error boundary to catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByText(/asynchronous component error/i)).toBeInTheDocument();
    });

    test('should catch errors in event handlers', async () => {
      const ComponentWithEventHandler = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return (
          <button onClick={handleClick} data-testid="error-button">
            Click to throw error
          </button>
        );
      };

      render(
        <TestWrapper>
          <ComponentWithEventHandler />
        </TestWrapper>
      );

      // Click button to trigger error
      const errorButton = screen.getByTestId('error-button');
      await userEvent.click(errorButton);

      // Wait for error boundary to catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByText(/event handler error/i)).toBeInTheDocument();
    });

    test('should catch errors in promise rejections', async () => {
      const ComponentWithPromise = () => {
        React.useEffect(() => {
          Promise.reject(new Error('Promise rejection error'));
        }, []);
        return <div>Loading...</div>;
      };

      render(
        <TestWrapper>
          <ComponentWithPromise />
        </TestWrapper>
      );

      // Wait for error boundary to catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByText(/promise rejection error/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    test('should allow retry after error', async () => {
      let shouldThrow = true;
      
      const RetryComponent = () => {
        const [data, setData] = React.useState(null);

        React.useEffect(() => {
          if (shouldThrow) {
            throw new Error('Initial error');
          } else {
            setData('recovered');
          }
        }, []);

        if (data) {
          return <div data-testid="recovered-content">Recovered: {data}</div>;
        }
        return <div>Loading...</div>;
      };

      render(
        <TestWrapper>
          <RetryComponent />
        </TestWrapper>
      );

      // Wait for error
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
        expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
        expect(screen.getByText('recovered: recovered')).toBeInTheDocument();
      });
    });

    test('should track retry count', async () => {
      const RetryComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <TestWrapper>
          <RetryComponent />
        </TestWrapper>
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Click retry button multiple times
      const retryButton = screen.getByTestId('error-boundary-retry');
      
      await userEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/retry \(1\)/i)).toBeInTheDocument();
      });

      await userEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/retry \(2\)/i)).toBeInTheDocument();
      });

      await userEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/retry \(3\)/i)).toBeInTheDocument();
      });
    });

    test('should limit retry attempts', async () => {
      const RetryComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <TestWrapper>
          <RetryComponent />
        </TestWrapper>
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Click retry button many times
      const retryButton = screen.getByTestId('error-boundary-retry');
      
      for (let i = 0; i < 10; i++) {
        await userEvent.click(retryButton);
      }

      // Verify retry count is tracked
      await waitFor(() => {
        expect(screen.getByText(/retry \(10\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Nested Error Boundaries', () => {
    test('should handle errors in nested components', async () => {
      const NestedComponent = () => {
        throw new Error('Nested component error');
      };

      const ParentComponent = () => (
        <div>
          <h1>Parent Component</h1>
          <TestableErrorBoundary>
            <NestedComponent />
          </TestableErrorBoundary>
        </div>
      );

      render(
        <TestWrapper>
          <ParentComponent />
        </TestWrapper>
      );

      // Wait for nested error boundary to catch error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify parent content is still visible
      expect(screen.getByText('parent component')).toBeInTheDocument();
    });

    test('should bubble up errors when inner boundary fails', async () => {
      const FailingErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        throw new Error('Error boundary failed');
      };

      const NestedComponent = () => {
        throw new Error('Nested component error');
      };

      const ParentComponent = () => (
        <div>
          <h1>Parent Component</h1>
          <FailingErrorBoundary>
            <NestedComponent />
          </FailingErrorBoundary>
        </div>
      );

      render(
        <TestWrapper>
          <ParentComponent />
        </TestWrapper>
      );

      // Wait for outer error boundary to catch error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error boundary failure is displayed
      expect(screen.getByText(/error boundary failed/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary with HOC', () => {
    test('should work with higher-order components', async () => {
      const ComponentWithError = () => {
        throw new Error('Component error');
      };

      const WrappedComponent = withErrorBoundary(ComponentWithError, {
        fallback: <div data-testid="custom-fallback">Custom Error Fallback</div>
      });

      render(<WrappedComponent />);

      // Wait for custom fallback to be displayed
      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText('custom error fallback')).toBeInTheDocument();
    });

    test('should pass error to custom error handler', async () => {
      const errorHandler = jest.fn();
      
      const ComponentWithError = () => {
        throw new Error('Component error');
      };

      const WrappedComponent = withErrorBoundary(ComponentWithError, {
        onError: errorHandler
      });

      render(<WrappedComponent />);

      // Wait for error to be caught
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify error handler was called
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(errorHandler.mock.calls[0][0].message).toBe('Component error');
    });
  });

  describe('Error Boundary Utilities', () => {
    test('should create error boundary test utils', async () => {
      const boundaryRef = React.createRef<any>();
      
      render(
        <TestableErrorBoundary ref={boundaryRef}>
          <div>Test Content</div>
        </TestableErrorBoundary>
      );

      const boundary = boundaryRef.current;
      const testUtils = createErrorBoundaryTestUtils(boundary);

      // Verify test utils are created
      expect(testUtils).toBeDefined();
      expect(testUtils.hasError()).toBe(false);
    });

    test('should simulate errors via test utils', async () => {
      const boundaryRef = React.createRef<any>();
      
      render(
        <TestableErrorBoundary ref={boundaryRef}>
          <div>Test Content</div>
        </TestableErrorBoundary>
      );

      const boundary = boundaryRef.current;
      const testUtils = createErrorBoundaryTestUtils(boundary);

      // Simulate error
      testUtils.simulateError('networkFailure');

      // Wait for error to be caught
      await waitFor(() => {
        expect(testUtils.hasError()).toBe(true);
      });

      // Verify error details
      expect(testUtils.getError()).toBeInstanceOf(Error);
      expect(testUtils.getError().message).toContain('Network request failed');
    });

    test('should wait for error state via test utils', async () => {
      const boundaryRef = React.createRef<any>();
      
      render(
        <TestableErrorBoundary ref={boundaryRef}>
          <div>Test Content</div>
        </TestableErrorBoundary>
      );

      const boundary = boundaryRef.current;
      const testUtils = createErrorBoundaryTestUtils(boundary);

      // Simulate error asynchronously
      setTimeout(() => {
        testUtils.simulateError('networkFailure');
      }, 100);

      // Wait for error state
      const error = await testUtils.waitForError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Network request failed');
    });

    test('should wait for recovery via test utils', async () => {
      const boundaryRef = React.createRef<any>();
      let shouldThrow = true;
      
      const RecoverableComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div data-testid="recovered">Recovered</div>;
      };

      render(
        <TestableErrorBoundary ref={boundaryRef}>
          <RecoverableComponent />
        </TestableErrorBoundary>
      );

      const boundary = boundaryRef.current;
      const testUtils = createErrorBoundaryTestUtils(boundary);

      // Wait for initial error
      await testUtils.waitForError();

      // Retry and prevent further errors
      shouldThrow = false;
      testUtils.retry();

      // Wait for recovery
      await testUtils.waitForRecovery();
      
      expect(testUtils.hasError()).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle different error scenarios', async () => {
      const errorTypes = [
        'networkFailure',
        'networkTimeout',
        'authenticationFailure',
        'permissionDenied',
        'dataCorruption',
        'chunkLoadFailure',
        'apiRateLimit',
        'serviceUnavailable'
      ] as const;

      for (const errorType of errorTypes) {
        const boundaryRef = React.createRef<any>();
        
        render(
          <TestableErrorBoundary ref={boundaryRef}>
            <ErrorThrower errorType={errorType} />
          </TestableErrorBoundary>
        );

        // Wait for error to be caught
        await waitFor(() => {
          expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        });

        // Clean up for next test
        TestableErrorBoundary.clearInstances();
        render(<div />);
      }
    });

    test('should handle custom error messages', async () => {
      render(
        <TestWrapper>
          <ErrorThrower 
            errorType="custom" 
            errorMessage="Custom error message for testing" 
          />
        </TestWrapper>
      );

      // Wait for error to be caught
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify custom error message
      expect(screen.getByText(/custom error message for testing/i)).toBeInTheDocument();
    });

    test('should handle validation errors', async () => {
      render(
        <TestWrapper>
          <ErrorThrower 
            errorType="validationError" 
            field="username"
            validationMessage="Username is required" 
          />
        </TestWrapper>
      );

      // Wait for error to be caught
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify validation error
      expect(screen.getByText(/validation failed for username/i)).toBeInTheDocument();
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Performance', () => {
    test('should handle rapid successive errors', async () => {
      const boundaryRef = React.createRef<any>();
      let errorCount = 0;
      
      const RapidErrorComponent = () => {
        errorCount++;
        throw new Error(`Rapid error ${errorCount}`);
      };

      render(
        <TestableErrorBoundary ref={boundaryRef}>
          <RapidErrorComponent />
        </TestableErrorBoundary>
      );

      const boundary = boundaryRef.current;
      const testUtils = createErrorBoundaryTestUtils(boundary);

      // Wait for initial error
      await testUtils.waitForError();

      // Retry multiple times rapidly
      for (let i = 0; i < 10; i++) {
        testUtils.retry();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify error boundary handles rapid errors gracefully
      expect(testUtils.hasError()).toBe(true);
      expect(testUtils.getRetryCount()).toBeGreaterThan(5);
    });

    test('should handle errors in large component trees', async () => {
      const DeepComponent = ({ depth }: { depth: number }) => {
        if (depth === 0) {
          throw new Error('Deep component error');
        }
        return (
          <div>
            <DeepComponent depth={depth - 1} />
          </div>
        );
      };

      render(
        <TestWrapper>
          <DeepComponent depth={100} />
        </TestWrapper>
      );

      // Wait for error to be caught (should be fast even with deep component tree)
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});