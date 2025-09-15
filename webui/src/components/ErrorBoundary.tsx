import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { connect } from 'react-redux';
import { RootState } from '../store';
import { addError } from '../store/slices/errorSlice';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  addError: typeof addError;
  errorReportingEnabled?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to Redux store for analytics
    this.props.addError({
      id: Date.now().toString(),
      type: 'runtime',
      message: error.message,
      stack: error.stack || '',
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      context: {
        componentName: this.constructor.name,
        recoveryAttempts: this.state.recoveryAttempts,
      },
    });

    // Report to external service if enabled
    if (this.props.errorReportingEnabled && window.location.hostname !== 'localhost') {
      this.reportErrorToService(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call parent error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Send error to external monitoring service
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  };

  handleRetry = () => {
    this.setState({ isRecovering: true }, () => {
      // Clear the error state to allow re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveryAttempts: this.state.recoveryAttempts + 1,
      });
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  renderErrorDetails = () => {
    const { error, errorInfo } = this.state;
    if (!error || !errorInfo) return null;

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <BugReportIcon color="error" />
            Error Details
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ typography: 'body2', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            <Typography variant="subtitle2" gutterBottom>
              Error Message:
            </Typography>
            <Typography component="pre" sx={{ 
              backgroundColor: 'error.light', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              color: 'error.contrastText'
            }}>
              {error.message}
            </Typography>
            
            {error.stack && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Stack Trace:
                </Typography>
                <Typography component="pre" sx={{ 
                  backgroundColor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1, 
                  overflow: 'auto',
                  fontSize: '0.7rem'
                }}>
                  {error.stack}
                </Typography>
              </>
            )}
            
            {errorInfo.componentStack && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Component Stack:
                </Typography>
                <Typography component="pre" sx={{ 
                  backgroundColor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1, 
                  overflow: 'auto',
                  fontSize: '0.7rem'
                }}>
                  {errorInfo.componentStack}
                </Typography>
              </>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  render() {
    const { hasError, isRecovering, recoveryAttempts, maxRecoveryAttempts } = this.state;

    if (hasError && recoveryAttempts >= maxRecoveryAttempts) {
      return this.renderFallback();
    }

    if (hasError) {
      return this.renderErrorBoundary();
    }

    return this.props.children;
  }

  renderFallback = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 6,
            maxWidth: 600,
            textAlign: 'center',
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <BugReportIcon sx={{ fontSize: 64, color: 'error.main', mb: 3 }} />
          
          <Typography variant="h4" gutterBottom color="error" fontWeight="bold">
            Critical Error
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            The application has encountered an unrecoverable error. We've logged this issue and our team will investigate.
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Error ID: {this.state.error?.message || 'Unknown error'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={this.handleRefresh}
              startIcon={<RefreshIcon />}
              size="large"
              sx={{ minWidth: 140 }}
            >
              Refresh Page
            </Button>
            
            <Button
              variant="outlined"
              onClick={this.handleReset}
              disabled={isRecovering}
              sx={{ minWidth: 140 }}
            >
              Reset Application
            </Button>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="body2">
                This error has been automatically reported to help improve the application.
              </Typography>
            </Alert>
          </Box>
        </Paper>
      </Box>
    );
  };

  renderErrorBoundary = () => {
    const { error, isRecovering, recoveryAttempts, maxRecoveryAttempts } = this.state;
    const canRetry = recoveryAttempts < maxRecoveryAttempts;

    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert
          severity="error"
          sx={{
            mb: 3,
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2">
                {error?.message || 'An unexpected error occurred'}
              </Typography>
            </Box>
            
            {canRetry && (
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                disabled={isRecovering}
                startIcon={isRecovering ? <CircularProgress size={16} /> : <RefreshIcon />}
                size="small"
              >
                {isRecovering ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </Box>
        </Alert>

        {this.renderErrorDetails()}

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={this.handleRefresh}
            startIcon={<RefreshIcon />}
          >
            Refresh Page
          </Button>
          
          <Button
            variant="text"
            onClick={this.handleReset}
            color="error"
          >
            Reset & Continue
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Recovery attempt {recoveryAttempts} of {maxRecoveryAttempts}
        </Typography>
      </Box>
    );
  };
}

// Connect to Redux store for error logging
const mapStateToProps = (state: RootState) => ({
  errorReportingEnabled: state.ui.errorReportingEnabled,
});

const mapDispatchToProps = {
  addError,
};

export default connect(mapStateToProps, mapDispatchToProps)(ErrorBoundary);