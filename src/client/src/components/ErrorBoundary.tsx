import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Lightweight client-side logging; keep it simple to avoid recursion
    console.error('ErrorBoundary caught an error', { error, info });
  }

  handleReload = () => {
    // Try a soft reload first to preserve cache; fallback to hard reload
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-base-content bg-base-100">
          <div className="card w-full max-w-2xl bg-base-200 shadow-xl border border-error/20">
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>

              <h2 className="card-title text-2xl font-bold mb-2">Something went wrong</h2>
              <p className="text-base-content/80 mb-6">
                The UI hit an unexpected error. Try reloading the application.
              </p>

              <div className="card-actions">
                <button
                  onClick={this.handleReload}
                  className="btn btn-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Application
                </button>
              </div>

              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="collapse collapse-arrow bg-base-300 mt-6 w-full text-left rounded-box border border-base-content/10">
                  <input type="checkbox" aria-label="Toggle error details" />
                  <div className="collapse-title text-sm font-medium text-base-content/80">
                    Error Details (Development Only)
                  </div>
                  <div className="collapse-content">
                    <div className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                      <div className="text-error font-bold mb-2">{this.state.error?.message}</div>
                      <div className="text-base-content/70 whitespace-pre-wrap">{this.state.error?.stack}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
