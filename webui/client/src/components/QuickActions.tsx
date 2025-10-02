import React, { useState } from 'react';
import {
  Button,
  Card,
  ToastNotification,
} from './DaisyUI';
import { apiService } from '../services/api';

interface QuickActionsProps {
  onRefresh?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFilename, setExportFilename] = useState('config-export');

  const showToastNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  const handleRefreshDashboard = async () => {
    setLoading('refresh');
    try {
      await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);

      showToastNotification('Dashboard refreshed successfully', 'success');

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showToastNotification(
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
      const response = await apiService.clearCache();
      showToastNotification(response.message || 'Cache cleared successfully', 'success');
    } catch (error) {
      showToastNotification(
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
      showToastNotification('Configuration exported successfully', 'success');
    } catch (error) {
      showToastNotification(
        error instanceof Error ? error.message : 'Failed to export configuration',
        'error'
      );
    } finally {
      setLoading(null);
    }
  };

  const isLoadingAction = (action: string) => loading === action;

  return (
    <>
      <Card className="mb-6">
        <div className="card-body">
          <h3 className="card-title">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              onClick={handleRefreshDashboard}
              disabled={isLoadingAction('refresh')}
              className="gap-2"
            >
              {isLoadingAction('refresh') ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '🔄'
              )}
              Refresh Dashboard
            </Button>

            <Button
              variant="secondary"
              onClick={handleClearCache}
              disabled={isLoadingAction('clear')}
              className="gap-2"
            >
              {isLoadingAction('clear') ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '🗑️'
              )}
              Clear Cache
            </Button>

            <Button
              variant="accent"
              onClick={() => setExportDialog(true)}
              disabled={isLoadingAction('export')}
              className="gap-2"
            >
              {isLoadingAction('export') ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '📥'
              )}
              Export Config
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Configuration Modal */}
      <input type="checkbox" id="export-modal" className="modal-toggle" checked={exportDialog} onChange={() => setExportDialog(!exportDialog)} />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Export Configuration</h3>
          <p className="py-2 text-sm opacity-70">
            Enter a filename for the configuration export:
          </p>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Filename</span>
            </label>
            <input
              type="text"
              placeholder="Filename"
              className="input input-bordered w-full"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              autoFocus
            />
            <label className="label">
              <span className="label-text-alt">File will be saved as .json</span>
            </label>
          </div>
          <div className="modal-action">
            <Button variant="ghost" onClick={() => setExportDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExportConfig}
              disabled={!exportFilename.trim() || isLoadingAction('export')}
            >
              {isLoadingAction('export') ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'Export'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type={toastType}
          onClose={handleCloseToast}
          duration={6000}
        />
      )}
    </>
  );
};

export default QuickActions;