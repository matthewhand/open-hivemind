import React, { useState } from 'react';
import { Card, Button, Modal, Input, Loading } from './DaisyUI';
import {
  ArrowPathIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface QuickActionsProps {
  onRefresh?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info',
  });
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFilename, setExportFilename] = useState('config-export');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
    // Auto-hide after 6 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const handleRefreshDashboard = async () => {
    setLoading('refresh');
    try {
      // Refresh the dashboard data by calling the existing API endpoints
      await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);

      showToast('Dashboard refreshed successfully', 'success');

      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to refresh dashboard',
        'error',
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
      showToast(response.message || 'Cache cleared successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to clear cache',
        'error',
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
      showToast('Configuration exported successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to export configuration',
        'error',
      );
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (action: string) => loading === action;

  const getToastIcon = () => {
    switch (toast.type) {
    case 'success': return <CheckCircleIcon className="w-6 h-6" />;
    case 'error': return <ExclamationCircleIcon className="w-6 h-6" />;
    default: return <InformationCircleIcon className="w-6 h-6" />;
    }
  };

  const getToastClass = () => {
    switch (toast.type) {
    case 'success': return 'alert-success';
    case 'error': return 'alert-error';
    default: return 'alert-info';
    }
  };

  return (
    <>
      <Card className="mb-6" title="Quick Actions">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="primary"
            onClick={handleRefreshDashboard}
            disabled={isLoading('refresh')}
            className="flex items-center gap-2"
          >
            {isLoading('refresh') ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <ArrowPathIcon className="w-5 h-5" />
            )}
            Refresh Dashboard
          </Button>

          <Button
            variant="secondary"
            onClick={handleClearCache}
            disabled={isLoading('clear')}
            className="flex items-center gap-2"
          >
            {isLoading('clear') ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <XMarkIcon className="w-5 h-5" />
            )}
            Clear Cache
          </Button>

          <Button
            variant="accent"
            onClick={() => setExportDialog(true)}
            disabled={isLoading('export')}
            className="flex items-center gap-2"
          >
            {isLoading('export') ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <ArrowDownTrayIcon className="w-5 h-5" />
            )}
            Export Config
          </Button>
        </div>
      </Card>

      {/* Export Configuration Modal */}
      <Modal
        isOpen={exportDialog}
        onClose={() => setExportDialog(false)}
        title="Export Configuration"
      >
        <div className="py-4">
          <p className="text-sm text-base-content/70 mb-4">
            Enter a filename for the configuration export:
          </p>
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
        </div>
        <div className="modal-action">
          <Button onClick={() => setExportDialog(false)} variant="ghost">
            Cancel
          </Button>
          <Button
            onClick={handleExportConfig}
            variant="primary"
            disabled={!exportFilename.trim() || isLoading('export')}
          >
            {isLoading('export') ? <span className="loading loading-spinner loading-sm"></span> : 'Export'}
          </Button>
        </div>
      </Modal>

      {/* Toast notification */}
      {toast.show && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${getToastClass()}`}>
            {getToastIcon()}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;