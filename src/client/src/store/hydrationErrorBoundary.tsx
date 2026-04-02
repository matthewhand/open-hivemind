/**
 * Hydration Error Boundary
 *
 * Catches errors caused by corrupted / incompatible persisted Redux state
 * during the initial render. When triggered it clears the persisted state,
 * notifies the user, and re-renders with a fresh store.
 */

import React from 'react';
import { clearPersistedState } from './stateVersioning';
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
    logger.error('[HydrationErrorBoundary] Caught hydration error:', error);
    logger.error('[HydrationErrorBoundary] Component stack:', errorInfo.componentStack);

    // Wipe the persisted state so the next render starts fresh.
    clearPersistedState();

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
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: '40rem', marginBottom: '1.5rem', color: '#666' }}>
            The application encountered an error while restoring your previous
            session. Your cached data has been cleared to prevent further issues.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre
              style={{
                maxWidth: '60rem',
                overflow: 'auto',
                padding: '1rem',
                background: '#f5f5f5',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '0.6rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              border: '1px solid #ccc',
              background: '#fff',
            }}
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
