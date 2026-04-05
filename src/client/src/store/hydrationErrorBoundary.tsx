/**
 * Hydration Error Boundary
 *
 * Catches render errors that may arise from corrupted cached data.
 * Notifies the user and re-renders cleanly.
 */

import React from 'react';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  children: React.ReactNode;
  /** Optional callback invoked with the caught error (e.g. for telemetry). */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class HydrationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('[HydrationErrorBoundary] Caught error:', error);
    logger.error('[HydrationErrorBoundary] Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-screen p-8 font-system text-center"
        >
          <h1 className="text-2xl mb-4">
            Something went wrong
          </h1>
          <p className="max-w-lg mb-6 text-base-content/60">
            The application encountered an unexpected error.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre
              className="max-w-5xl overflow-auto p-4 bg-base-200 rounded-lg text-sm mb-6 text-left"
            >
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="btn btn-outline"
          >
            Reload application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HydrationErrorBoundary;
