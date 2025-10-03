import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Input } from './DaisyUI';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface QuickActionsProps {
  onRefresh?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFilename, setExportFilename] = useState('config-export');

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefreshDashboard = async () => {
    setLoading('refresh');
    try {
      // Refresh the dashboard data by calling the existing API endpoints
      await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);

      showSnackbar('Dashboard refreshed successfully', 'success');

      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : 'Failed to refresh dashboard',
        'error'
      );
    } finally {
      setLoading(null);
    }
  };

  const handleClearCache = async () => {
    setLoading('clear');
    try {
      // Call the clear cache API endpoint
      const response = await apiService.clearCache();
      showSnackbar(response.message || 'Cache cleared successfully', 'success');
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : 'Failed to clear cache',
        'error'
      );
    } finally {
      setLoading(null);
    }
  };

  const handleExportConfig = async () => {
    setLoading('export');
    try {
      const blob = await apiService.exportConfig();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportFilename}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportDialog(false);
      showSnackbar('Configuration exported successfully', 'success');
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : 'Failed to export configuration',
        'error'
      );
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (action: string) => loading === action;

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={
                isLoading('refresh') ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )
              }
              onClick={handleRefreshDashboard}
              disabled={isLoading('refresh')}
              color="primary"
            >
              Refresh Dashboard
            </Button>

            <Button
              variant="contained"
              startIcon={
                isLoading('clear') ? (
                  <CircularProgress size={20} />
                ) : (
                  <ClearIcon />
                )
              }
              onClick={handleClearCache}
              disabled={isLoading('clear')}
              color="secondary"
            >
              Clear Cache
            </Button>

            <Button
              variant="contained"
              startIcon={
                isLoading('export') ? (
                  <CircularProgress size={20} />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={() => setExportDialog(true)}
              disabled={isLoading('export')}
              color="success"
            >
              Export Config
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Export Configuration Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
        <DialogTitle>Export Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a filename for the configuration export:
          </Typography>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Filename</span>
            </label>
            <Input
              autoFocus
              placeholder="Filename"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt">File will be saved as .json</span>
            </label>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          <Button
            onClick={handleExportConfig}
            variant="contained"
            disabled={!exportFilename.trim() || isLoading('export')}
          >
            {isLoading('export') ? (
              <CircularProgress size={20} />
            ) : (
              'Export'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickActions;