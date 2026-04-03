import React from 'react';
import Debug from 'debug';
import Button from './DaisyUI/Button';
const debug = Debug('app:client:components:ErrorBoundary');

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI — when provided, replaces the default error card entirely. */
  fallback?: React.ReactNode;
  /** Label shown in the error card (e.g. "Dashboard"). Defaults to "This page". */
  pageName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary used both at the app root and around individual routes.
 *
 * - Renders a DaisyUI-styled recovery card with Retry and Go Home actions.
 * - When rendered **outside** a `<BrowserRouter>` (e.g. in main.tsx) it falls
 *   back to a plain `<a>` tag for navigation and a full page reload for retry.
 * - Accepts an optional `fallback` prop to completely replace the default UI.
 * - Shows the error message in a code block for easier debugging.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = this.props.pageName ?? 'Unknown';
    debug('ERROR:', `[ErrorBoundary] Error in "${context}":`, error, errorInfo);

    // Attempt to extract the object causing the crash from the react error info
    if (error.message.includes('Objects are not valid as a React child')) {
       console.error("REACT CRASH DETAILS: Check component stack below for the culprit!");
       console.error(errorInfo.componentStack);
    }
  }

  /** Reset component state so the children re-mount (soft retry). */
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  /** Full page reload — useful as a last resort. */
  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  /**
   * Attempt to render a react-router-dom `<Link>`.  If the router context is
   * unavailable (component is above `<BrowserRouter>`) we fall back to a
   * regular anchor tag so the top-level boundary still works.
   */
  renderHomeLink() {
    try {
      // Dynamic require so the module is only resolved at render time.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Link } = require('react-router-dom');
      return (
        <Link to="/dashboard" className="btn btn-outline">
          Go Home
        </Link>
      );
    } catch {
      return (
        <a href="/dashboard" className="btn btn-outline">
          Go Home
        </a>
      );
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const pageName = this.props.pageName ?? 'This page';

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="card bg-base-100 shadow-xl max-w-lg w-full">
            <div className="card-body items-center text-center">
              <div className="text-error text-5xl mb-2">!</div>
              <h2 className="card-title text-error">Something went wrong</h2>
              <p className="text-base-content/70 mt-2">
                <strong>{pageName}</strong> encountered an unexpected error.
              </p>
              {this.state.error && (
                <div className="bg-base-200 rounded-lg p-3 mt-3 w-full text-left">
                  <p className="text-sm font-mono text-base-content/80 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="card-actions mt-6 gap-3">
                <Button variant="primary" onClick={this.handleRetry}>
                  Retry
                </Button>
                {this.renderHomeLink()}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * @deprecated Use `ErrorBoundary` directly. This alias exists for backward
 * compatibility with route-level imports.
 */
export { ErrorBoundary as RouteErrorBoundary };
