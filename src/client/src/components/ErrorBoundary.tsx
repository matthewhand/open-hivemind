import React from 'react';

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
      if (this.props.fallback) {return <>{this.props.fallback}</>;}

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-base-300 text-base-content rounded-xl m-4 border border-base-content/10 shadow-lg">
          <h1 className="text-3xl font-bold mb-2 text-error">Something went wrong</h1>
          <p className="opacity-80 mb-6 text-lg">
            The UI hit an unexpected error. Try reloading.
          </p>
          <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
            <button
              onClick={this.handleReload}
              className="btn btn-primary"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details open className="mt-4 w-full bg-base-200 p-4 rounded-lg border border-base-content/20">
                <summary className="cursor-pointer font-semibold mb-2 text-error">Error details</summary>
                <pre className="whitespace-pre-wrap text-left text-xs overflow-x-auto bg-base-100 p-3 rounded text-error-content/80 font-mono">
                  {this.state.error?.message}\n{this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

