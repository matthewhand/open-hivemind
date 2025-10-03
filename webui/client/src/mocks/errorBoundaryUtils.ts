import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryTestProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  shouldCatchErrors?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

// Testable Error Boundary component
export class TestableErrorBoundary extends Component<ErrorBoundaryTestProps, ErrorBoundaryState> {
  private static instances: TestableErrorBoundary[] = [];

  constructor(props: ErrorBoundaryTestProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
    TestableErrorBoundary.instances.push(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError && this.props.shouldCatchErrors !== false) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div data-testid="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={this.retry} data-testid="error-boundary-retry">
            Retry ({this.state.retryCount})
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  // Static methods for testing
  static getAllInstances(): TestableErrorBoundary[] {
    return [...TestableErrorBoundary.instances];
  }

  static clearInstances(): void {
    TestableErrorBoundary.instances = [];
  }

  static triggerErrorInAllInstances(error: Error): void {
    TestableErrorBoundary.instances.forEach(instance => {
      instance.setState({
        hasError: true,
        error,
        errorInfo: {
          componentStack: 'Test error stack'
        }
      });
    });
  }

  static resetAllInstances(): void {
    TestableErrorBoundary.instances.forEach(instance => {
      instance.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: 0
      });
    });
  }
}

// Error simulation utilities
export class ErrorSimulator {
  private static errors: { [key: string]: Error } = {
    networkError: new Error('Network request failed'),
    timeoutError: new Error('Request timeout'),
    parseError: new Error('Failed to parse response'),
    authError: new Error('Authentication failed'),
    permissionError: new Error('Permission denied'),
    validationError: new Error('Validation failed'),
    chunkLoadError: new Error('Chunk load failed'),
    unknownError: new Error('Unknown error occurred')
  };

  static getError(type: keyof typeof ErrorSimulator.errors): Error {
    return ErrorSimulator.errors[type] || ErrorSimulator.errors.unknownError;
  }

  static createCustomError(message: string, type: string = 'custom'): Error {
    const error = new Error(message);
    (error as any).type = type;
    return error;
  }

  static createNetworkError(status: number, statusText: string): Error {
    const error = new Error(`Network error: ${status} ${statusText}`);
    (error as any).status = status;
    (error as any).statusText = statusText;
    (error as any).type = 'network';
    return error;
  }

  static createTimeoutError(timeout: number): Error {
    const error = new Error(`Request timed out after ${timeout}ms`);
    (error as any).timeout = timeout;
    (error as any).type = 'timeout';
    return error;
  }

  static createValidationError(field: string, message: string): Error {
    const error = new Error(`Validation failed for ${field}: ${message}`);
    (error as any).field = field;
    (error as any).type = 'validation';
    return error;
  }
}

// Error scenario generators
export const errorScenarios = {
  networkFailure: () => ErrorSimulator.createNetworkError(500, 'Internal Server Error'),
  networkTimeout: () => ErrorSimulator.createTimeoutError(30000),
  authenticationFailure: () => ErrorSimulator.getError('authError'),
  permissionDenied: () => ErrorSimulator.getError('permissionError'),
  dataCorruption: () => ErrorSimulator.createCustomError('Data corruption detected', 'corruption'),
  chunkLoadFailure: () => ErrorSimulator.getError('chunkLoadError'),
  apiRateLimit: () => ErrorSimulator.createNetworkError(429, 'Too Many Requests'),
  serviceUnavailable: () => ErrorSimulator.createNetworkError(503, 'Service Unavailable'),
  customError: (message: string) => ErrorSimulator.createCustomError(message),
  validationError: (field: string, message: string) => ErrorSimulator.createValidationError(field, message)
};

// Component that throws errors for testing
export interface ErrorThrowerProps {
  errorType?: keyof typeof errorScenarios | 'custom';
  errorMessage?: string;
  shouldThrow?: boolean;
  delay?: number;
  field?: string;
  validationMessage?: string;
}

export const ErrorThrower: React.FC<ErrorThrowerProps> = ({
  errorType = 'unknownError',
  errorMessage,
  shouldThrow = true,
  delay = 0,
  field,
  validationMessage
}) => {
  React.useEffect(() => {
    if (!shouldThrow) return;

    const throwError = () => {
      let error: Error;

      if (errorType === 'custom' && errorMessage) {
        error = errorScenarios.customError(errorMessage);
      } else if (errorType === 'validationError' && field && validationMessage) {
        error = errorScenarios.validationError(field, validationMessage);
      } else if (errorType in errorScenarios) {
        error = errorScenarios[errorType as keyof typeof errorScenarios]();
      } else {
        error = ErrorSimulator.getError(errorType as keyof typeof ErrorSimulator.errors);
      }

      throw error;
    };

    if (delay > 0) {
      const timer = setTimeout(throwError, delay);
      return () => clearTimeout(timer);
    } else {
      throwError();
    }
  }, [errorType, errorMessage, shouldThrow, delay, field, validationMessage]);

  return <div data-testid="error-thrower">Error Thrower Component</div>;
};

// Test utilities for error boundary testing
export class ErrorBoundaryTestUtils {
  private boundary: TestableErrorBoundary;
  private errors: Error[] = [];
  private errorInfos: ErrorInfo[] = [];

  constructor(boundary: TestableErrorBoundary) {
    this.boundary = boundary;
  }

  // Simulate an error in the boundary
  simulateError(errorType: keyof typeof errorScenarios | 'custom', errorMessage?: string): void {
    let error: Error;

    if (errorType === 'custom' && errorMessage) {
      error = errorScenarios.customError(errorMessage);
    } else if (errorType in errorScenarios) {
      error = errorScenarios[errorType as keyof typeof errorScenarios]();
    } else {
      error = ErrorSimulator.getError(errorType as keyof typeof ErrorSimulator.errors);
    }

    this.errors.push(error);
    TestableErrorBoundary.triggerErrorInAllInstances(error);
  }

  // Get the current error state
  getErrorState(): ErrorBoundaryState {
    return this.boundary.state;
  }

  // Check if boundary is in error state
  hasError(): boolean {
    return this.boundary.state.hasError;
  }

  // Get the current error
  getError(): Error | undefined {
    return this.boundary.state.error;
  }

  // Get the error info
  getErrorInfo(): ErrorInfo | undefined {
    return this.boundary.state.errorInfo;
  }

  // Get retry count
  getRetryCount(): number {
    return this.boundary.state.retryCount;
  }

  // Trigger retry
  retry(): void {
    this.boundary.retry();
  }

  // Wait for error state
  waitForError(timeout: number = 5000): Promise<Error> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkError = () => {
        if (this.boundary.state.hasError && this.boundary.state.error) {
          resolve(this.boundary.state.error);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for error state'));
        } else {
          setTimeout(checkError, 100);
        }
      };
      checkError();
    });
  }

  // Wait for recovery
  waitForRecovery(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkRecovery = () => {
        if (!this.boundary.state.hasError) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for recovery'));
        } else {
          setTimeout(checkRecovery, 100);
        }
      };
      checkRecovery();
    });
  }

  // Get all captured errors
  getCapturedErrors(): Error[] {
    return [...this.errors];
  }

  // Get all captured error infos
  getCapturedErrorInfos(): ErrorInfo[] {
    return [...this.errorInfos];
  }

  // Clear captured errors
  clearCapturedErrors(): void {
    this.errors = [];
    this.errorInfos = [];
  }

  // Reset the boundary
  reset(): void {
    this.boundary.retry();
    this.clearCapturedErrors();
  }
}

// Factory function to create error boundary test utils
export const createErrorBoundaryTestUtils = (boundary: TestableErrorBoundary): ErrorBoundaryTestUtils => {
  return new ErrorBoundaryTestUtils(boundary);
};

// Higher-order component for testing error boundaries
export const withErrorBoundary = (
  Component: React.ComponentType<any>,
  errorBoundaryProps?: ErrorBoundaryTestProps
) => {
  return (props: any) => (
    <TestableErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </TestableErrorBoundary>
  );
};

// Hook for testing error boundaries in functional components
export const useErrorBoundaryTest = (boundary: TestableErrorBoundary | null) => {
  const [testUtils, setTestUtils] = React.useState<ErrorBoundaryTestUtils | null>(null);

  React.useEffect(() => {
    if (boundary) {
      setTestUtils(new ErrorBoundaryTestUtils(boundary));
    }
  }, [boundary]);

  return testUtils;
};