import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
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

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
  showReportDialog: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      showReportDialog: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Error Report:', errorReport);

    // Example: Send to error reporting service
    // errorReportingService.captureException(error, { extra: errorReport });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
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

  private getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    if (error.name === 'ChunkLoadError') return 'warning';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'warning';
    return 'error';
  };

  private getErrorTitle = (error: Error): string => {
    if (error.name === 'ChunkLoadError') return 'Application Update Available';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'Connection Error';
    return 'Something went wrong';
  };

  private getErrorMessage = (error: Error): string => {
    if (error.name === 'ChunkLoadError') {
      return 'A new version of the application is available. Please refresh to get the latest features and bug fixes.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    return 'An unexpected error occurred. Our team has been notified and is working to fix the issue.';
  };

  private getRecoveryActions = (error: Error) => {
    const actions = [];

    if (error.name === 'ChunkLoadError') {
      actions.push({ label: 'Refresh Page', action: this.handleReload, primary: true });
    } else {
      actions.push({ label: 'Try Again', action: this.handleReset, primary: true });
      actions.push({ label: 'Go Home', action: this.handleGoHome });
      actions.push({ label: 'Reload Page', action: this.handleReload });
    }

    return actions;
  };

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