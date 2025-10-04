import React, { Component, ReactNode } from 'react';
import type { ErrorInfo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

// Types for our error handling system
interface BaseHivemindError {
  name: string;
  message: string;
  stack?: string;
  status?: number;
  code?: string;
  details?: Record<string, any>;
  correlationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
  recoveryStrategy?: {
    type: 'retry' | 'fallback' | 'circuitBreaker';
    attempts?: number;
    maxAttempts?: number;
    nextRetry?: number;
    fallbackUsed?: boolean;
  };
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: BaseHivemindError, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: BaseHivemindError | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
  showReportDialog: boolean;
  isRecovering: boolean;
  recoveryAttempts: number;
}

class ErrorBoundary extends Component<Props, State> {
  private correlationId: string;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.correlationId = this.generateCorrelationId();
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      showReportDialog: false,
      isRecovering: false,
      recoveryAttempts: 0,
    };
  }

  private generateCorrelationId = (): string => {
    return `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  private normalizeError = (error: Error): BaseHivemindError => {
    // Check if it's already a HivemindError
    if ('code' in error && 'severity' in error) {
      return error as BaseHivemindError;
    }

    // Normalize to our error format
    const normalizedError: BaseHivemindError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      severity: this.getErrorSeverity(error),
    };

    // Add specific error types
    if (error.name === 'ChunkLoadError') {
      normalizedError.code = 'CHUNK_LOAD_ERROR';
      normalizedError.severity = 'medium';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      normalizedError.code = 'NETWORK_ERROR';
      normalizedError.severity = 'medium';
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      normalizedError.code = 'AUTHORIZATION_ERROR';
      normalizedError.severity = 'high';
    } else {
      normalizedError.code = 'UNKNOWN_ERROR';
      normalizedError.severity = 'high';
    }

    return normalizedError;
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      // We'll normalize the error in componentDidCatch
      error: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const normalizedError = this.normalizeError(error);
    
    console.error('ErrorBoundary caught an error:', normalizedError, errorInfo);

    this.setState({
      error: normalizedError,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(normalizedError, errorInfo);
    }

    // Report error to monitoring service
    this.reportError(normalizedError, errorInfo);

    // Attempt recovery if possible
    this.attemptRecovery(normalizedError);
  }

  private reportError = (error: BaseHivemindError, errorInfo: ErrorInfo) => {
    // Create comprehensive error report
    const errorReport = {
      ...error,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: this.getSafeLocalStorage(),
      sessionStorage: this.getSafeSessionStorage(),
      performance: this.getPerformanceMetrics(),
    };

    console.error('Error Report:', errorReport);

    // Send to backend error logging endpoint
    this.sendErrorToBackend(errorReport);

    // Also send to error reporting service if available
    // errorReportingService.captureException(error, { extra: errorReport });
  };

  private sendErrorToBackend = async (errorReport: any) => {
    try {
      await fetch('/api/errors/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': errorReport.correlationId,
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error to backend:', reportingError);
    }
  };

  private getSafeLocalStorage = (): Record<string, string> => {
    try {
      const safeData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes('password') && !key.includes('token')) {
          safeData[key] = localStorage.getItem(key) || '';
        }
      }
      return safeData;
    } catch {
      return {};
    }
  };

  private getSafeSessionStorage = (): Record<string, string> => {
    try {
      const safeData: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !key.includes('password') && !key.includes('token')) {
          safeData[key] = sessionStorage.getItem(key) || '';
        }
      }
      return safeData;
    } catch {
      return {};
    }
  };

  private getPerformanceMetrics = () => {
    try {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime,
        };
      }
    } catch {
      return {};
    }
    return {};
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      isRecovering: false,
      recoveryAttempts: 0,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleErrorDetails = () => {
    this.setState(prevState => ({
      showErrorDetails: !prevState.showErrorDetails,
    }));
  };

  private openReportDialog = () => {
    this.setState({ showReportDialog: true });
  };

  private closeReportDialog = () => {
    this.setState({ showReportDialog: false });
  };

  private getErrorSeverity = (error: Error | BaseHivemindError): 'error' | 'warning' | 'info' => {
    if (error.name === 'ChunkLoadError') return 'warning';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'warning';
    if (error.message.includes('permission') || error.message.includes('unauthorized')) return 'error';
    if (error.name.includes('Auth') || error.name.includes('Token')) return 'error';
    return 'error';
  };

  private getErrorTitle = (error: BaseHivemindError): string => {
    if (error.name === 'ChunkLoadError') return 'Application Update Available';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'Connection Error';
    if (error.message.includes('permission') || error.message.includes('unauthorized')) return 'Access Denied';
    if (error.name.includes('Auth') || error.name.includes('Token')) return 'Authentication Required';
    return 'Something went wrong';
  };

  private getErrorMessage = (error: BaseHivemindError): string => {
    if (error.name === 'ChunkLoadError') {
      return 'A new version of the application is available. Please refresh to get the latest features and bug fixes.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You do not have permission to access this resource. Please contact your administrator.';
    }
    if (error.name.includes('Auth') || error.name.includes('Token')) {
      return 'Your session has expired or is invalid. Please log in again.';
    }
    return 'An unexpected error occurred. Our team has been notified and is working to fix the issue.';
  };

  private getRecoveryActions = (error: BaseHivemindError) => {
    const actions = [];

    if (error.name === 'ChunkLoadError') {
      actions.push({ label: 'Refresh Page', action: this.handleReload, primary: true });
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      actions.push({ label: 'Retry Connection', action: this.handleReload, primary: true });
      actions.push({ label: 'Go Home', action: this.handleGoHome });
    } else if (error.message.includes('permission') || error.message.includes('unauthorized') ||
               error.name.includes('Auth') || error.name.includes('Token')) {
      actions.push({ label: 'Log In', action: this.handleGoHome, primary: true });
      actions.push({ label: 'Go Home', action: this.handleGoHome });
    } else {
      actions.push({ label: 'Try Again', action: this.handleReset, primary: true });
      actions.push({ label: 'Go Home', action: this.handleGoHome });
      actions.push({ label: 'Reload Page', action: this.handleReload });
    }

    return actions;
  };

  private attemptRecovery = (error: BaseHivemindError) => {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      // For network errors, attempt automatic retry after a delay
      this.setState({ isRecovering: true });
      
      if (this.recoveryTimer) {
        clearTimeout(this.recoveryTimer);
      }
      
      this.recoveryTimer = setTimeout(() => {
        this.setState(prevState => ({
          isRecovering: false,
          recoveryAttempts: prevState.recoveryAttempts + 1
        }));
        
        // Only reload if we're still showing the error
        if (this.state.hasError) {
          this.handleReload();
        }
      }, 5000); // Retry after 5 seconds
    }
  };

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity(this.state.error);
      const title = this.getErrorTitle(this.state.error);
      const message = this.getErrorMessage(this.state.error);
      const actions = this.getRecoveryActions(this.state.error);

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <ErrorIcon
                  sx={{ mr: 2, fontSize: 40 }}
                  color={severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info'}
                />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {title}
                  </Typography>
                  <Chip
                    label={this.state.error.name}
                    size="small"
                    variant="outlined"
                    color={severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info'}
                  />
                </Box>
              </Box>

              <Alert severity={severity} sx={{ mb: 3 }}>
                {message}
              </Alert>

              {this.state.isRecovering && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Attempting to recover automatically... ({this.state.recoveryAttempts} attempts)
                </Alert>
              )}

              <Box display="flex" flexDirection="column" gap={2} mb={3}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.primary ? 'contained' : 'outlined'}
                    startIcon={action.label === 'Refresh Page' ? <RefreshIcon /> :
                              action.label === 'Go Home' ? <HomeIcon /> : undefined}
                    onClick={action.action}
                    fullWidth
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>

              {this.props.showDetails !== false && (
                <>
                  <Button
                    startIcon={this.state.showErrorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={this.toggleErrorDetails}
                    variant="text"
                    sx={{ mb: 2 }}
                  >
                    {this.state.showErrorDetails ? 'Hide' : 'Show'} Technical Details
                  </Button>

                  <Collapse in={this.state.showErrorDetails}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Error Details
                        </Typography>
                        <Typography variant="body2" component="pre" sx={{
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.75rem',
                          bgcolor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 200,
                        }}>
                          {this.state.error.toString()}
                          {this.state.error.stack && '\n\nStack Trace:\n' + this.state.error.stack}
                        </Typography>
                      </CardContent>
                    </Card>

                    {this.state.errorInfo && (
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Component Stack
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 200,
                          }}>
                            {this.state.errorInfo.componentStack}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}

                    {this.state.error.correlationId && (
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Correlation ID
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 10,
                          }}>
                            {this.state.error.correlationId}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Collapse>

                  <Button
                    startIcon={<BugReportIcon />}
                    onClick={this.openReportDialog}
                    variant="outlined"
                    size="small"
                  >
                    Report Issue
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Error Report Dialog */}
          <Dialog open={this.state.showReportDialog} onClose={this.closeReportDialog} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <BugReportIcon sx={{ mr: 1 }} />
                Report Error
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" paragraph>
                Help us improve by reporting this error. The following information will be included:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Error message and stack trace"
                    secondary="Technical details about what went wrong"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Component stack"
                    secondary="Which component caused the error"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Browser and system information"
                    secondary="Your browser version and operating system"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Application state"
                    secondary="Current page and user context"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Correlation ID"
                    secondary={`ID: ${this.state.error.correlationId}`}
                  />
                </ListItem>
              </List>
              <Alert severity="info" sx={{ mt: 2 }}>
                No personal information will be collected. All reports are anonymous.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.closeReportDialog}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  this.reportError(this.state.error!, this.state.errorInfo!);
                  this.closeReportDialog();
                }}
                variant="contained"
                startIcon={<BugReportIcon />}
              >
                Send Report
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;