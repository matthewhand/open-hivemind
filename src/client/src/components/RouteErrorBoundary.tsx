import React from 'react';
import { Link } from 'react-router-dom';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary that catches render errors in child components
 * and displays a DaisyUI-styled recovery UI with retry and navigation options.
 */
class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = this.props.pageName ?? 'Unknown Page';
    console.error(`[RouteErrorBoundary] Error in "${context}":`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
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
                <button className="btn btn-primary" onClick={this.handleRetry}>
                  Retry
                </button>
                <Link to="/dashboard" className="btn btn-outline">
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
