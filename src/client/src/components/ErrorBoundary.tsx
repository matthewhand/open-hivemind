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

    // Attempt to extract the object causing the crash from the react error info
    // This is a hacky way to find the culprit object, as React's error messages
    // often don't include the exact object reference in a structured way.
    if (error.message.includes('Objects are not valid as a React child')) {
       console.error("REACT CRASH DETAILS: Check component stack below for the culprit!");
       console.error(info.componentStack);
    }
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          color: '#fff',
          background: 'linear-gradient(135deg, #1f2937, #111827)',
        }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
            The UI hit an unexpected error. Try reloading.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={this.handleReload} style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}>
              Reload
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details open style={{ marginTop: '1rem', maxWidth: 800 }}>
                <summary style={{ cursor: 'pointer' }}>Error details</summary>
                <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
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

